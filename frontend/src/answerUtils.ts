const LETTERS = ["A", "B", "C", "D", "E"];

export function toAnswerIndex(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return -1;
    const letterIndex = LETTERS.indexOf(trimmed);
    if (letterIndex >= 0) return letterIndex;
    const numeric = Number(trimmed);
    if (Number.isInteger(numeric)) return numeric;
  }
  return -1;
}

export function answerLetter(index: number): string {
  return index >= 0 && index < LETTERS.length ? LETTERS[index] : "";
}
