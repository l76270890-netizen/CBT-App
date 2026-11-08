import type JSZip from "jszip";
import { isSafeImageReference, normalizeImageReference, parseQuestionCsv, type CsvQuestionRow } from "./adminQuestionCsv.ts";

const maxZipBytes = 25 * 1024 * 1024;
const maxZipEntries = 1000;
const maxImageBytes = 5 * 1024 * 1024;
const imageTypeByExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

type ZipFileData = { uncompressedSize?: number };
type LoadedQuestionZip = { rows: CsvQuestionRow[]; images: Map<string, File> };

export async function loadQuestionZip(file: File, subjects: string[]): Promise<LoadedQuestionZip> {
  if (file.size > maxZipBytes) throw new Error("This ZIP is larger than 25 MB. Reduce its size and try again.");

  const { default: JSZipModule } = await import("jszip");
  let archive: JSZip;
  try {
    archive = await JSZipModule.loadAsync(file);
  } catch {
    throw new Error("Could not open this ZIP file. Make sure it is a valid, unencrypted archive.");
  }

  const entries = Object.values(archive.files);
  if (entries.length > maxZipEntries) throw new Error(`This ZIP contains too many files. Use no more than ${maxZipEntries}.`);
  if (entries.some(entry => entry.unsafeOriginalName?.split(/[\\/]/).includes(".."))) {
    throw new Error("This ZIP contains an unsafe file path.");
  }

  const csvEntries = entries.filter(entry => !entry.dir && entry.name.split("/").pop()?.toLowerCase() === "questions.csv");
  if (csvEntries.length !== 1) throw new Error("The ZIP must contain exactly one file named questions.csv.");
  const csvSize = (csvEntries[0] as JSZip.JSZipObject & { _data?: ZipFileData })._data?.uncompressedSize;
  if (typeof csvSize !== "number" || csvSize > 5 * 1024 * 1024) {
    throw new Error("The questions.csv file is missing or larger than 5 MB.");
  }
  const rows = parseQuestionCsv(await csvEntries[0].async("string"), subjects, { allowImageReferences: true });
  const fileEntries = entries.filter(entry => !entry.dir);
  const filesByPath = new Map(fileEntries.map(entry => [normalizeImageReference(entry.name), entry]));
  const images = new Map<string, File>();
  const imageErrors = new Map<string, string>();

  for (const row of rows) {
    const reference = row.imageUrl?.trim();
    if (!reference || !isSafeImageReference(reference)) continue;

    const normalizedReference = normalizeImageReference(reference);
    if (images.has(normalizedReference) || imageErrors.has(normalizedReference)) continue;

    const imageEntry = filesByPath.get(normalizedReference)
      ?? filesByPath.get(normalizeImageReference(`images/${reference}`));
    if (!imageEntry) {
      imageErrors.set(normalizedReference, `Image "${reference}" was not found in the ZIP.`);
      continue;
    }

    const extension = imageEntry.name.split(".").pop()?.toLowerCase() || "";
    const size = (imageEntry as JSZip.JSZipObject & { _data?: ZipFileData })._data?.uncompressedSize;
    if (typeof size === "number" && size > maxImageBytes) {
      imageErrors.set(normalizedReference, `Image "${reference}" is larger than 5 MB.`);
      continue;
    }

    try {
      const blob = await imageEntry.async("blob");
      if (blob.size > maxImageBytes) {
        imageErrors.set(normalizedReference, `Image "${reference}" is larger than 5 MB.`);
        continue;
      }
      images.set(normalizedReference, new File([blob], imageEntry.name.split("/").pop() || reference, {
        type: imageTypeByExtension[extension],
      }));
    } catch {
      imageErrors.set(normalizedReference, `Image "${reference}" could not be extracted from the ZIP.`);
    }
  }

  return {
    rows: rows.map(row => {
      const reference = row.imageUrl?.trim();
      const error = reference ? imageErrors.get(normalizeImageReference(reference)) : undefined;
      return error ? { ...row, errors: [...row.errors, error] } : row;
    }),
    images,
  };
}
