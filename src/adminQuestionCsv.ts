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
  imageUrl?: string;
  errors: string[];
  status?: "imported" | "failed";
  importError?: string;
}

const requiredHeaders = ["subject", "question", "optiona", "optionb", "optionc", "optiond", "correctanswer", "explanation"];
export const csvTemplateHeaders = ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "subject", "explanation", "imageUrl"];
const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export function normalizeImageReference(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\.\/+/, "").toLowerCase();
}

export function isSafeImageReference(value: string): boolean {
  const reference = value.trim().replace(/\\/g, "/");
  const parts = reference.split("/");
  const extension = parts[parts.length - 1]?.split(".").pop()?.toLowerCase();
  return !!reference
    && !reference.startsWith("/")
    && !reference.includes(":")
    && parts.every(part => part && part !== "." && part !== "..")
    && ["png", "jpg", "jpeg"].includes(extension || "");
}

export function isValidQuestionImageUrl(value: string): boolean {
  const imageUrl = value.trim();
  if (!imageUrl || imageUrl.startsWith("//")) return false;
  if (imageUrl.startsWith("/")) return true;
  if (/^(uploads|questions)\//i.test(imageUrl)) return true;

  try {
    const url = new URL(imageUrl);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname;
  } catch {
    return false;
  }
}

export function parseQuestionCsv(contents: string, subjects: string[], options: { allowImageReferences?: boolean } = {}): CsvQuestionRow[] {
  const parseWithDelimiter = (delimiter: string) => Papa.parse<Record<string, string>>(contents, {
    header: true,
    delimiter,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });
  const candidates = [",", ";", "\t"].map(parseWithDelimiter);
  const scoreHeaders = (fields: string[] | undefined) =>
    requiredHeaders.filter(header => fields?.includes(header)).length;
  const results = candidates.reduce((best, candidate) =>
    scoreHeaders(candidate.meta.fields) > scoreHeaders(best.meta.fields) ? candidate : best,
  );

  const parseErrors = results.errors.filter(error => error.code !== "UndetectableDelimiter");
  if (parseErrors.length > 0) throw new Error(`Could not read this CSV: ${parseErrors[0].message}`);
  if (results.data.length === 0) throw new Error("The CSV has no question rows yet.");

  const availableHeaders = results.meta.fields || [];
  const missingHeaders = requiredHeaders.filter(header => !availableHeaders.includes(header));
  if (missingHeaders.length > 0) {
    if (missingHeaders.length === requiredHeaders.length) {
      throw new Error("Could not find the template columns. Use the downloaded CSV template; do not rename an Excel .xlsx file to .csv.");
    }
    throw new Error(`Missing required columns: ${missingHeaders.join(", ")}. Download the template for the correct format.`);
  }

  const subjectByNormalizedName = new Map(subjects.map(subject => [subject.trim().toLowerCase().replace(/\s+/g, " "), subject]));
  const seenQuestions = new Set<string>();
  return results.data.map((row, index): CsvQuestionRow => {
    const rawSubject = String(row.subject ?? "").trim();
    const question = String(row.question ?? "").trim();
    const optionA = String(row.optiona ?? "").trim();
    const optionB = String(row.optionb ?? "").trim();
    const optionC = String(row.optionc ?? "").trim();
    const optionD = String(row.optiond ?? "").trim();
    const correctAnswer = String(row.correctanswer ?? "").trim().toUpperCase();
    const explanation = String(row.explanation ?? "").trim();
    const rawImageUrl = String(row.imageurl ?? "").trim();
    const errors: string[] = [];
    const subject = subjectByNormalizedName.get(rawSubject.toLowerCase().replace(/\s+/g, " "));

    if (!rawSubject) errors.push("Subject is required");
    else if (!subject) errors.push(`Subject "${rawSubject}" is not listed on this exam`);
    if (!question) errors.push("Question is required");
    if (!optionA || !optionB || !optionC || !optionD) errors.push("All four options are required");
    if (!["A", "B", "C", "D"].includes(correctAnswer)) errors.push("Correct answer must be A, B, C, or D");
    if (rawImageUrl && !isValidQuestionImageUrl(rawImageUrl) && !(options.allowImageReferences && isSafeImageReference(rawImageUrl))) {
      errors.push("Image URL must be a valid HTTP(S) URL or a relative upload path");
    }

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
      ...(rawImageUrl ? { imageUrl: rawImageUrl } : {}),
      errors,
    };
  });
}
