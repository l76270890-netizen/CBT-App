import type { Novel, NovelProgress } from './novelTypes'

const DB_NAME = 'examcore-novels'
const DB_VERSION = 1

type PendingAttempt = { clientAttemptId: string; novelId: number; score: number; total: number; answers: any; completedAt: string }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('novels')) db.createObjectStore('novels', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('chapters')) {
        const s = db.createObjectStore('chapters', { keyPath: 'key' }); s.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('pdfs')) db.createObjectStore('pdfs', { keyPath: 'novelId' })
      if (!db.objectStoreNames.contains('covers')) db.createObjectStore('covers', { keyPath: 'novelId' })
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'novelId' })
      if (!db.objectStoreNames.contains('questionSets')) db.createObjectStore('questionSets', { keyPath: 'novelId' })
      if (!db.objectStoreNames.contains('pendingAttempts')) db.createObjectStore('pendingAttempts', { keyPath: 'clientAttemptId' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveNovelDownload(novel: Novel, pdfBlob?: Blob | null, coverBlob?: Blob | null) {
  const db = await openDB()
  await new Promise<void>((res, rej) => {
    const stores = ['novels','chapters','questionSets','meta']
    if (pdfBlob) stores.push('pdfs')
    if (coverBlob) stores.push('covers')
    const t = db.transaction(stores, 'readwrite')
    t.objectStore('novels').put({ ...novel, chapters: undefined, questions: undefined, downloadedAt: Date.now(), downloadStatus: 'downloaded' })
    if (Array.isArray(novel.chapters)) {
      for (const ch of novel.chapters) t.objectStore('chapters').put({ ...ch, key: `${novel.id}:${ch.id}`, novelId: novel.id })
    }
    if (Array.isArray(novel.questions)) t.objectStore('questionSets').put({ novelId: novel.id, questions: novel.questions, updatedAt: Date.now() })
    t.objectStore('meta').put({ key: `novel-status:${novel.id}`, status: 'downloaded', updatedAt: novel.updatedAt || null })
    if (pdfBlob) t.objectStore('pdfs').put({ novelId: novel.id, blob: pdfBlob, type: pdfBlob.type || 'application/pdf' })
    if (coverBlob) t.objectStore('covers').put({ novelId: novel.id, blob: coverBlob, type: coverBlob.type || 'image/*' })
    t.oncomplete = () => res(); t.onerror = () => rej(t.error)
  })
}

export async function getNovelBlob(kind: 'pdfs'|'covers', novelId: number): Promise<Blob | null> {
  const db = await openDB(); return new Promise((res, rej)=>{ const t=db.transaction(kind,'readonly'); const r=t.objectStore(kind).get(novelId); r.onsuccess=()=>res(r.result?.blob||null); r.onerror=()=>rej(r.error) })
}

export async function getDownloadedNovels(): Promise<Novel[]> {
  const db = await openDB(); return new Promise((res, rej)=>{ const t=db.transaction('novels','readonly'); const r=t.objectStore('novels').getAll(); r.onsuccess=()=>res((r.result||[]) as Novel[]); r.onerror=()=>rej(r.error) })
}

export async function getDownloadedNovel(id: number): Promise<Novel | null> {
  const db = await openDB();
  return new Promise((res, rej)=>{
    const t=db.transaction(['novels','chapters','questionSets'],'readonly');
    const rn=t.objectStore('novels').get(id);
    const rc=t.objectStore('chapters').index('novelId').getAll(id);
    const rq=t.objectStore('questionSets').get(id);
    let novel:any=null, chapters:any[]=[], qset:any=null;
    rn.onsuccess=()=>{ novel=rn.result||null }
    rc.onsuccess=()=>{ chapters=rc.result||[] }
    rq.onsuccess=()=>{ qset=rq.result||null }
    t.oncomplete=()=>{
      if(!novel){ res(null); return }
      novel.chapters = chapters.sort((a,b)=>(a.position??0)-(b.position??0))
      novel.questions = qset?.questions || []
      res(novel as Novel)
    }
    t.onerror=()=>rej(t.error)
  })
}

export async function removeDownloadedNovel(id: number) {
  const db = await openDB();
  await new Promise<void>((res, rej)=>{
    const t=db.transaction(['novels','chapters','pdfs','covers','questionSets','meta'],'readwrite');
    t.objectStore('novels').delete(id); t.objectStore('pdfs').delete(id); t.objectStore('covers').delete(id); t.objectStore('questionSets').delete(id); t.objectStore('meta').delete(`novel-status:${id}`);
    const idx=t.objectStore('chapters').index('novelId');
    const req=idx.openCursor(IDBKeyRange.only(id));
    req.onsuccess=()=>{ const c=req.result; if(c){ c.delete(); c.continue(); } };
    t.oncomplete=()=>res(); t.onerror=()=>rej(t.error)
  })
}

export async function saveProgressLocal(novelId: number, progress: NovelProgress) {
  const db = await openDB(); await new Promise<void>((res, rej)=>{ const t=db.transaction('progress','readwrite'); t.objectStore('progress').put({ novelId, ...progress, updatedAt: Date.now() }); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error) })
}
export async function getProgressLocal(novelId: number): Promise<NovelProgress | null> {
  const db = await openDB(); return new Promise((res, rej)=>{ const t=db.transaction('progress','readonly'); const r=t.objectStore('progress').get(novelId); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error) })
}

export async function queueNovelAttempt(a: PendingAttempt) {
  const db = await openDB(); await new Promise<void>((res, rej)=>{ const t=db.transaction('pendingAttempts','readwrite'); t.objectStore('pendingAttempts').put(a); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error) })
}
export async function getPendingAttempts(): Promise<PendingAttempt[]> {
  const db = await openDB(); return new Promise((res, rej)=>{ const t=db.transaction('pendingAttempts','readonly'); const r=t.objectStore('pendingAttempts').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error) })
}
export async function clearPendingAttempts(ids: string[]) {
  const db = await openDB(); await new Promise<void>((res, rej)=>{ const t=db.transaction('pendingAttempts','readwrite'); for(const id of ids) t.objectStore('pendingAttempts').delete(id); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error) })
}

export async function estimateStorage() {
  try {
    if (navigator.storage && (navigator.storage as any).estimate) {
      const e = await (navigator.storage as any).estimate(); return { usage: e.usage || 0, quota: e.quota || 0 }
    }
  } catch {}
  return { usage: 0, quota: 0 }
}
