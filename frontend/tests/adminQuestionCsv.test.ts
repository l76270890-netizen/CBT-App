import assert from "node:assert/strict";
import test from "node:test";
import { csvTemplateHeaders, isSupportedQuestionImage, parseQuestionCsv, summarizeQuestionImageMatches } from "../src/adminQuestionCsv.ts";

const subjects = ["Mathematics"];

test("requires original examination year column for each question", () => {
  const csv = [
    "subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    'Mathematics,"What is 2 + 2?",3,4,5,6,B,"Basic addition"',
  ].join("\n");
  assert.throws(() => parseQuestionCsv(csv, subjects), /Missing required columns: year/);
});

test("imports CSV with original examination year and keeps its image URL", () => {
  const csv = [
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,year,explanation,imageUrl",
    'What is 2 + 2?,3,4,5,6,B,Mathematics,2000,Basic addition,https://cdn.example.com/diagram.png',
  ].join("\n");

  const [row] = parseQuestionCsv(csv, subjects);
  assert.equal(row.year, "2000");
  assert.equal(row.imageUrl, "https://cdn.example.com/diagram.png");
  assert.deepEqual(row.errors, []);
});

test("rejects missing, empty, malformed, and out-of-range years", () => {
  const missing = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    "Mathematics,,What is 2 + 2?,3,4,5,6,B,Basic addition",
  ].join("\n"), subjects)[0];
  assert.ok(missing.errors.some(e => /Original examination year is required/i.test(e)));

  const nonNumeric = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    "Mathematics,20AB,What is 2 + 2?,3,4,5,6,B,Basic addition",
  ].join("\n"), subjects)[0];
  assert.ok(nonNumeric.errors.some(e => /valid four-digit year/i.test(e)));

  const shortYear = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    "Mathematics,999,What is 2 + 2?,3,4,5,6,B,Basic addition",
  ].join("\n"), subjects)[0];
  assert.ok(shortYear.errors.some(e => /valid four-digit year/i.test(e)));

  const longYear = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    "Mathematics,20245,What is 2 + 2?,3,4,5,6,B,Basic addition",
  ].join("\n"), subjects)[0];
  assert.ok(longYear.errors.some(e => /valid four-digit year/i.test(e)));
});

test("downloadable CSV template includes year column", () => {
  assert.ok(csvTemplateHeaders.includes("year"));
  assert.deepEqual(csvTemplateHeaders, ["Question","Option A","Option B","Option C","Option D","Correct Answer","subject","year","explanation","imageUrl"]);
});

test("allows an empty optional image URL and rejects malformed image URLs", () => {
  const emptyImage = parseQuestionCsv([
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,year,explanation,imageUrl",
    "What is 2 + 2?,3,4,5,6,B,Mathematics,2001,Basic addition,",
  ].join("\n"), subjects)[0];
  assert.equal(emptyImage.imageUrl, undefined);
  assert.deepEqual(emptyImage.errors, []);

  const invalidImage = parseQuestionCsv([
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,year,explanation,imageUrl",
    "What is 2 + 2?,3,4,5,6,B,Mathematics,2001,Basic addition,javascript:alert(1)",
  ].join("\n"), subjects)[0];
  assert.ok(invalidImage.errors.includes("Image URL must be a valid HTTP(S) URL or a relative upload path"));
});

test("matches selected images by filename and reports missing or ambiguous references", () => {
  const rows = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl",
    "Mathematics,2000,First question,A,B,C,D,A,,images/Triangle.png",
    "Mathematics,2001,Second question,A,B,C,D,A,,missing.jpg",
    "Mathematics,2001,Third question,A,B,C,D,A,,duplicate.png",
  ].join("\n"), subjects, { allowImageReferences: true });
  const files = [
    new File(["image"], "triangle.png", { type: "image/png" }),
    new File(["image"], "duplicate.PNG", { type: "image/png" }),
    new File(["image"], "duplicate.png", { type: "image/png" }),
  ];

  const summary = summarizeQuestionImageMatches(rows, files);
  assert.equal(summary.imagesSelected, 3);
  assert.equal(summary.imagesMatched, 1);
  assert.equal(summary.missingImages, 2);
  assert.deepEqual(summary.missingReferences, ["missing.jpg", "duplicate.png"]);
});

test("accepts supported image types and rejects unsupported extensions or MIME types", () => {
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.jpg", { type: "image/jpeg" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp", { type: "image/webp" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp", { type: "image/png" })), false);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.png", { type: "image/gif" })), false);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp")), true);
});

test("matches WEBP image references by filename", () => {
  const rows = parseQuestionCsv([
    "subject,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl",
    "Mathematics,2000,Question with image,A,B,C,D,A,,images/diagram.webp",
  ].join("\n"), subjects, { allowImageReferences: true });

  const summary = summarizeQuestionImageMatches(rows, [
    new File(["image"], "diagram.webp", { type: "image/webp" }),
  ]);
  assert.equal(summary.imagesMatched, 1);
  assert.equal(summary.missingImages, 0);
});
