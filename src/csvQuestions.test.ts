import assert from "node:assert/strict";
import test from "node:test";
import { isValidImageUrl, parseCsvQuestions } from "./csvQuestions.ts";

const subjects = ["Biology"];

test("imports the existing eight-column CSV format without an image", () => {
  const csv = [
    "subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation",
    "Biology,Which cell part stores DNA?,Nucleus,Ribosome,Cell wall,Vacuole,A,Stores most genetic material",
  ].join("\n");

  const result = parseCsvQuestions(csv, subjects);
  assert.equal(result.error, undefined);
  assert.equal(result.rows?.length, 1);
  assert.equal(result.rows?.[0].errors.length, 0);
  assert.equal(result.rows?.[0].imageUrl, "");
});

test("imports the nine-column format and preserves a valid image URL", () => {
  const csv = [
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
    'Which cell part stores DNA?,Nucleus,Ribosome,Cell wall,Vacuole,A,Biology,Stores most genetic material,https://images.example.org/cell.png?size=large',
  ].join("\n");

  const result = parseCsvQuestions(csv, subjects);
  assert.equal(result.error, undefined);
  assert.equal(result.rows?.length, 1);
  assert.equal(result.rows?.[0].errors.length, 0);
  assert.equal(result.rows?.[0].imageUrl, "https://images.example.org/cell.png?size=large");
});

test("allows an empty image URL and flags malformed or unsafe URLs", () => {
  const emptyImage = parseCsvQuestions([
    "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
    "Question?,A,B,C,D,A,Biology,,",
  ].join("\n"), subjects);
  assert.equal(emptyImage.rows?.[0].errors.length, 0);

  assert.equal(isValidImageUrl("https://images.example.org/diagram.jpg"), true);
  assert.equal(isValidImageUrl("javascript:alert(1)"), false);
  assert.equal(isValidImageUrl("https://user:pass@example.org/image.png"), false);
  assert.equal(isValidImageUrl("not a URL"), false);
});
