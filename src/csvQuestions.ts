import Papa from "papaparse";

export type CsvQuestionRow = {
  rowNumber: number;
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  imageUrl: string;
  errors: string[];
  status?: "imported" | "failed";
  importError?: string;
};

export const csvTemplateHeaders = [
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "subject",
  "explanation",
  "imageUrl",
];

const requiredCsvHeaders = [
  "question",
  "optiona",
  "optionb",
  "optionc",
  "optiond",
  "correctanswer",
  "subject",
  "explanation",
];
const maxCsvRows = 500;

export function isValidImageUrl(value: string): boolean {
  if (!value || value.length > 1000 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseCsvQuestions(
  contents: string,
  configuredSubjects: string[],
): { rows: CsvQuestionRow[]; error?: never } | { rows?: never; error: string } {
  const parseWithDelimiter = (delimiter: string) => Papa.parse<Record<string, string>>(contents, {
    header: true,
    delimiter,
    skipEmptyLines: "greedy",
    transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
  });
  const candidates = [",", ";", "\t"].map(parseWithDelimiter);
  const scoreHeaders = (fields: string[] | undefined) =>
    requiredCsvHeaders.filter(header => fields?.includes(header)).length;
  const results = candidates.reduce((best, candidate) =>
    scoreHeaders(candidate.meta.fields) > scoreHeaders(best.meta.fields) ? candidate : best,
  );

  const parseErrors = results.errors.filter(error => error.code !== "UndetectableDelimiter");
  if (parseErrors.length > 0) {
    return { error: `Could not read this CSV: ${parseErrors[0].message}` };
  }
  if (results.data.length === 0) {
    return { error: "The CSV has no question rows yet." };
  }
  if (results.data.length > maxCsvRows) {
    return { error: `This file has ${results.data.length} rows. Import up to ${maxCsvRows} questions at a time.` };
  }

  const availableHeaders = results.meta.fields || [];
  const missingHeaders = requiredCsvHeaders.filter(header => !availableHeaders.includes(header));
  if (missingHeaders.length > 0) {
    if (missingHeaders.length === requiredCsvHeaders.length) {
      return { error: "Could not find the template columns. Use the downloaded CSV template; do not rename an Excel .xlsx file to .csv." };
    }
    return { error: `Missing required columns: ${missingHeaders.join(", ")}. Download the template for the correct format.` };
  }

  const subjectByNormalizedName = new Map(configuredSubjects.map(subject => [
    subject.trim().toLowerCase().replace(/\s+/g, " "),
    subject,
  ]));
  const seenQuestions = new Set<string>();
  const rows = results.data.map((row, index): CsvQuestionRow => {
    const rawSubject = String(row.subject ?? "").trim();
    const question = String(row.question ?? "").trim();
    const optionA = String(row.optiona ?? "").trim();
    const optionB = String(row.optionb ?? "").trim();
    const optionC = String(row.optionc ?? "").trim();
    const optionD = String(row.optiond ?? "").trim();
    const correctAnswer = String(row.correctanswer ?? "").trim().toUpperCase();
    const explanation = String(row.explanation ?? "").trim();
    const imageUrl = String(row.imageurl ?? "").trim();
    const errors: string[] = [];
    const subject = subjectByNormalizedName.get(rawSubject.toLowerCase().replace(/\s+/g, " "));

    if (!rawSubject) errors.push("Subject is required");
    else if (!subject) errors.push(`Subject "${rawSubject}" is not listed on this exam`);
    if (!question) errors.push("Question is required");
    if (!optionA || !optionB || !optionC || !optionD) errors.push("All four options are required");
    if (!["A", "B", "C", "D"].includes(correctAnswer)) errors.push("Correct answer must be A, B, C, or D");
    if (imageUrl && !isValidImageUrl(imageUrl)) errors.push("Image URL must be a valid HTTP or HTTPS URL");

    const questionKey = `${subject?.toLowerCase() || rawSubject.toLowerCase()}:${question.toLowerCase().replace(/\s+/g, " ")}`;
    if (questionKey && seenQuestions.has(questionKey)) errors.push("Duplicate question in this file");
    if (questionKey) seenQuestions.add(questionKey);

    return {
      rowNumber: index + 2,
      subject: subject || rawSubject,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      imageUrl,
      errors,
    };
  });

  return { rows };
}
