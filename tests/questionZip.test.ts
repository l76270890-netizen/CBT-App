import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { loadQuestionZip } from "../src/questionZip.ts";

const csv = [
  "Question,Option A,Option B,Option C,Option D,Correct Answer,subject,explanation,imageUrl",
  "Identify the shape,Triangle,Square,Circle,Rectangle,A,Mathematics,See diagram,triangle.png",
].join("\n");

async function createZip(image?: Uint8Array): Promise<File> {
  const zip = new JSZip();
  zip.file("questions.csv", csv);
  if (image) zip.file("images/triangle.png", image);
  const data = await zip.generateAsync({ type: "nodebuffer" });
  return new File([data], "questions.zip", { type: "application/zip" });
}

test("extracts referenced question images from a ZIP and keeps the question row", async () => {
  const { rows, images } = await loadQuestionZip(await createZip(new Uint8Array([137, 80, 78, 71])), ["Mathematics"]);
  assert.deepEqual(rows[0].errors, []);
  assert.equal(rows[0].imageUrl, "triangle.png");
  assert.equal(images.get("triangle.png")?.name, "triangle.png");
});

test("marks missing referenced images as row errors", async () => {
  const { rows, images } = await loadQuestionZip(await createZip(), ["Mathematics"]);
  assert.equal(images.size, 0);
  assert.ok(rows[0].errors.some(error => error.includes('Image "triangle.png" was not found')));
});

test("requires exactly one questions.csv file", async () => {
  const zip = new JSZip();
  zip.file("notes.txt", "No question CSV");
  const data = await zip.generateAsync({ type: "nodebuffer" });
  const file = new File([data], "questions.zip");
  await assert.rejects(loadQuestionZip(file, ["Mathematics"]), /exactly one file named questions\.csv/);
});
