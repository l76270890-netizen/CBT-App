import { openDB } from './novelStore';

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
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  })
}

export async function getQuestion(id: string | number): Promise<QuestionRecord | null> {
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  const key = id ? `${id}:${store.keyPath('id')}` : 'q-' + String(id);
  // Try direct lookup by id first
  let res = await store.get(key);
  if (res !== undefined && res !== null) return JSON.parse(res);
  // Fallback search by subject/question text
  const all = await store.getAll();
  for (const row of all) {
    if ((row as any).id === id || (row as any).question === id || (row as any).subject === id) {
      return JSON.parse(row);
    }
  }
  return null;
}

export async function putQuestion(id: string | number, record: Partial<QuestionRecord> = {}): Promise<void> {
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  await store.put({ id, ...record }, id);
}

export async function getAllQuestions(): Promise<QuestionRecord[]> {
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  const rows = await store.getAll();
  return rows.map(r => JSON.parse(r));
}

export async function findQuestionBySubject(subject: string, year?: number): Promise<QuestionRecord | null> {
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  const subjects = new Set([subject]);
  const results: QuestionRecord[] = [];
  for (const row of await store.getAll()) {
    const s = (row as any).subject || '';
    if (s.includes(subject.toLowerCase())) {
      results.push(JSON.parse(row));
    }
  }
  return results.find(r => r.id === subject || r.question === subject || r.subject === subject || r.id === subject);
}

export async function saveQuestion(id: string | number, record: Omit<QuestionRecord, 'options'> = {}): Promise<void> {
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  await store.put({ id, ...record }, id);
}
