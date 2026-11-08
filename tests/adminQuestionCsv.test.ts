import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedQuestionImage, parseQuestionCsv, summarizeQuestionImageMatches } from "../src/adminQuestionCsv.ts";

const subjects = ["Mathematics"];

test("imports the existing eight-column CSV without an image", () => {
  const csv = [
    "subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    'Mathematics,"What is 2 + 2?",3,4,5,6,B,"Basic addition"',
  ].join("\n");

  const [row] = parseQuestionCsv(csv, subjects);
  assert.equal(row.question, "What is 2 + 2?");
  assert.equal(row.imageUrl, undefined);
  assert.deepEqual(row.errors, []);
});

test("imports the new nine-column CSV and keeps its image URL", () => {
  const csv = [
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
    'What is 2 + 2?,3,4,5,6,B,Mathematics,Basic addition,https://cdn.example.com/diagram.png',
  ].join("\n");

  const [row] = parseQuestionCsv(csv, subjects);
  assert.equal(row.imageUrl, "https://cdn.example.com/diagram.png");
  assert.deepEqual(row.errors, []);
});

test("allows an empty optional image URL and rejects malformed image URLs", () => {
  const emptyImage = parseQuestionCsv([
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
    "What is 2 + 2?,3,4,5,6,B,Mathematics,Basic addition,",
  ].join("\n"), subjects)[0];
  assert.equal(emptyImage.imageUrl, undefined);
  assert.deepEqual(emptyImage.errors, []);

  const invalidImage = parseQuestionCsv([
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
    "What is 2 + 2?,3,4,5,6,B,Mathematics,Basic addition,javascript:alert(1)",
  ].join("\n"), subjects)[0];
  assert.ok(invalidImage.errors.includes("Image URL must be a valid HTTP(S) URL or a relative upload path"));
});

test("matches selected images by filename and reports missing or ambiguous references", () => {
  const rows = parseQuestionCsv([
    "subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl",
    "Mathematics,First question,A,B,C,D,A,,images/Triangle.png",
    "Mathematics,Second question,A,B,C,D,A,,missing.jpg",
    "Mathematics,Third question,A,B,C,D,A,,duplicate.png",
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
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp", { type: "image/webp" })), false);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.png", { type: "image/gif" })), false);
});
