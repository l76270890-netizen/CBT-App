export const CBT_SUBJECT_COUNT = 4;

export function isCbtExamType(value: string): boolean {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'CBT' || normalized === 'BECE';
}

export function isEnglishSubject(name: string): boolean {
  return /^(use of )?english( language)?$/i.test(String(name || '').trim());
}

export function validateCbtSubjectSelection(subjects: string[]): string | null {
  const unique = Array.from(new Set(subjects.map(subject => String(subject || '').trim()).filter(Boolean)));
  if (unique.length !== CBT_SUBJECT_COUNT) {
    return 'CBT requires exactly 4 subjects, including English Language, before continuing.';
  }
  if (!unique.some(isEnglishSubject)) {
    return 'English Language is required for CBT.';
  }
  return null;
}
