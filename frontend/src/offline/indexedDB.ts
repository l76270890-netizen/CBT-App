import { toCloneable } from './db';

const INDEXEDDB_NAME = 'examcore-indexed';
const INDEXEDDB_VERSION = 1;

export interface QuestionRecord {
  id: string | number;
  subject: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  topic?: string;
  year?: number;
  imageUrl?: string;
}

export async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('questions')) db.createObjectStore('questions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('subjects')) db.createObjectStore('subjects');
      if (!db.objectStoreNames.contains('topics')) db.createObjectStore('topics');
      if (!db.objectStoreNames.contains('answers')) db.createObjectStore('answers');
      if (!db.objectStoreNames.contains('explanations')) db.createObjectStore('explanations');
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function parseQuestion(value: unknown): QuestionRecord | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as QuestionRecord;
    } catch {
      return null;
    }
  }
  return value as QuestionRecord;
}

export async function getQuestion(id: string | number): Promise<QuestionRecord | null> {
  const db = await initIndexedDB();
  const transaction = db.transaction('questions', 'readonly');
  const store = transaction.objectStore('questions');
  const direct = parseQuestion(await requestResult(store.get(id)));
  if (direct) return direct;
  const rows = await requestResult(store.getAll());
  for (const row of rows) {
    const question = parseQuestion(row);
    if (question && (question.id === id || question.question === id || question.subject === id)) {
      return question;
    }
  }
  return null;
}

export async function putQuestion(id: string | number, record: Partial<QuestionRecord> = {}): Promise<void> {
  const resolvedId = id ?? record.id;
  if (resolvedId === undefined || resolvedId === null || String(resolvedId).trim() === '') {
    throw new Error('putQuestion requires a non-empty id');
  }
  const db = await initIndexedDB();
  const transaction = db.transaction('questions', 'readwrite');
  transaction.objectStore('questions').put(toCloneable({ ...record, id: resolvedId }));
  await transactionDone(transaction);
}

export async function getAllQuestions(): Promise<QuestionRecord[]> {
  const db = await initIndexedDB();
  const transaction = db.transaction('questions', 'readonly');
  const rows = await requestResult(transaction.objectStore('questions').getAll());
  return rows.map(parseQuestion).filter((row): row is QuestionRecord => Boolean(row));
}

export async function findQuestionBySubject(subject: string, year?: number): Promise<QuestionRecord | null> {
  const rows = await getAllQuestions();
  const results = rows.filter(row => {
    const value = row.subject || '';
    return value.toLowerCase().includes(subject.toLowerCase()) && (year === undefined || row.year === year);
  });
  return results.find(row => row.id === subject || row.question === subject || row.subject === subject) || results[0] || null;
}

export async function saveQuestion(id: string | number, record: Omit<QuestionRecord, 'options'> = {}): Promise<void> {
  await putQuestion(id, record);
}