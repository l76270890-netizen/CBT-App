export type NovelChapter = { id: number; novelId: number; title: string; content: string; position: number; updatedAt?: string }
export type NovelQuestion = { id: string; questionId?: number; novelId: number; question: string; options: string[]; answer: number; correctAnswer?: string; explanation?: string; imageUrl?: string; topic?: string; subject?: string }
export type NovelProgress = { chapterId?: number | null; readingPosition?: number; completedChapters?: number[]; bookmarks?: any[]; percent?: number; lastReadAt?: string | null }
export type Novel = {
  id: number; title: string; author: string; description: string; category: string;
  coverUrl?: string | null; pdfUrl?: string | null; pdfEnabled?: boolean; hasPdf?: boolean;
  published?: boolean; chapterCount?: number; questionCount?: number; downloadSize?: number | null;
  updatedAt?: string; chapters?: NovelChapter[]; questions?: NovelQuestion[]; progress?: NovelProgress | null;
  downloadStatus?: 'not_downloaded'|'downloading'|'downloaded'|'failed'|'partial';
  downloadPercent?: number;
}
