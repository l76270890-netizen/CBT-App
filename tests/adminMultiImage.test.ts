import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedQuestionImage,
  parseQuestionCsv,
  summarizeQuestionImageMatches,
} from "../admin/src/adminQuestionCsv.ts";

test("validates PNG, JPG, JPEG, and WEBP uploads against their MIME types", () => {
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.png", { type: "image/png" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.jpg", { type: "image/jpeg" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.jpeg", { type: "image/jpeg" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp", { type: "image/webp" })), true);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.webp", { type: "image/png" })), false);
  assert.equal(isSupportedQuestionImage(new File(["x"], "diagram.gif", { type: "image/gif" })), false);
});

test("matches selected images to CSV imageUrl references and reports missing files", () => {
  const rows = parseQuestionCsv([
    "subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl",
    "Mathematics,Matched,A,B,C,D,A,,images/Triangle.webp",
    "Mathematics,Missing,A,B,C,D,A,,missing.png",
  ].join("\n"), ["Mathematics"], { allowImageReferences: true });
  const summary = summarizeQuestionImageMatches(rows, [
    new File(["image"], "triangle.webp", { type: "image/webp" }),
  ]);

  assert.equal(summary.imagesSelected, 1);
  assert.equal(summary.imagesMatched, 1);
  assert.equal(summary.missingImages, 1);
  assert.deepEqual(summary.missingReferences, ["missing.png"]);
});
