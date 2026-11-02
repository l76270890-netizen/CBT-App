import assert from "node:assert/strict";
import test from "node:test";
import { parseQuestionCsv } from "../src/adminQuestionCsv.ts";

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
