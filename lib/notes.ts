import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const notesDirectory = path.join(process.cwd(), 'content/notes');

export interface Note {
  id: string;
  content: string;
  images?: string[];
  videos?: string[];
  date: string;
  createdAt: number; // 时间戳，用于排序
  likes?: number; // 点赞数
}

// 确保目录存在
function ensureDirectoryExists() {
  if (!fs.existsSync(notesDirectory)) {
    fs.mkdirSync(notesDirectory, { recursive: true });
  }
}

export function getAllNotes(): Note[] {
  ensureDirectoryExists();
  
  if (!fs.existsSync(notesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(notesDirectory);
  const allNotes = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const id = fileName.replace(/\.md$/, '');
      const fullPath = path.join(notesDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // 解析日期
      let dateStr = '';
      let createdAt = 0;
      if (data.date) {
        if (data.date instanceof Date) {
          dateStr = data.date.toISOString().split('T')[0];
          createdAt = data.date.getTime();
        } else {
          dateStr = String(data.date);
          createdAt = new Date(dateStr).getTime();
        }
      } else {
        // 如果没有日期，使用文件名中的时间戳
        const timestamp = parseInt(id);
        if (!isNaN(timestamp)) {
          createdAt = timestamp;
          const date = new Date(timestamp);
          dateStr = date.toISOString().split('T')[0];
        } else {
          dateStr = new Date().toISOString().split('T')[0];
          createdAt = new Date().getTime();
        }
      }

      return {
        id,
        content: content.trim(),
        images: data.images || [],
        videos: data.videos || [],
        date: dateStr,
        createdAt,
        likes: data.likes || 0,
      } as Note;
    });

  // 按创建时间倒序排列（最新的在前）
  return allNotes.sort((a, b) => b.createdAt - a.createdAt);
}

export function getNoteById(id: string): Note | null {
  ensureDirectoryExists();
  
  const filePath = path.join(notesDirectory, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  let dateStr = '';
  let createdAt = 0;
  if (data.date) {
    if (data.date instanceof Date) {
      dateStr = data.date.toISOString().split('T')[0];
      createdAt = data.date.getTime();
    } else {
      dateStr = String(data.date);
      createdAt = new Date(dateStr).getTime();
    }
  } else {
    const timestamp = parseInt(id);
    if (!isNaN(timestamp)) {
      createdAt = timestamp;
      const date = new Date(timestamp);
      dateStr = date.toISOString().split('T')[0];
    }
  }

  return {
    id,
    content: content.trim(),
    images: data.images || [],
    videos: data.videos || [],
    date: dateStr,
    createdAt,
    likes: data.likes || 0,
  } as Note;
}

export function createNote(content: string, images?: string[], videos?: string[]): string {
  ensureDirectoryExists();
  
  const timestamp = Date.now();
  const id = timestamp.toString();
  const date = new Date().toISOString().split('T')[0];

  const frontMatter = {
    date,
    likes: 0,
    ...(images && images.length > 0 && { images }),
    ...(videos && videos.length > 0 && { videos }),
  };

  const markdownContent = matter.stringify(content, frontMatter);
  const filePath = path.join(notesDirectory, `${id}.md`);
  fs.writeFileSync(filePath, markdownContent, 'utf8');

  return id;
}

export function updateNote(id: string, content: string, images?: string[], videos?: string[]): boolean {
  ensureDirectoryExists();
  
  const filePath = path.join(notesDirectory, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const oldNote = getNoteById(id);
  if (!oldNote) {
    return false;
  }

  const frontMatter = {
    date: oldNote.date,
    likes: oldNote.likes || 0,
    ...(images && images.length > 0 && { images }),
    ...(videos && videos.length > 0 && { videos }),
  };

  const markdownContent = matter.stringify(content, frontMatter);
  fs.writeFileSync(filePath, markdownContent, 'utf8');

  return true;
}

export function likeNote(id: string): boolean {
  ensureDirectoryExists();
  
  const note = getNoteById(id);
  if (!note) {
    return false;
  }

  const frontMatter = {
    date: note.date,
    likes: (note.likes || 0) + 1,
    ...(note.images && note.images.length > 0 && { images: note.images }),
    ...(note.videos && note.videos.length > 0 && { videos: note.videos }),
  };

  const markdownContent = matter.stringify(note.content, frontMatter);
  const filePath = path.join(notesDirectory, `${id}.md`);
  fs.writeFileSync(filePath, markdownContent, 'utf8');

  return true;
}

export function deleteNote(id: string): boolean {
  ensureDirectoryExists();
  
  const filePath = path.join(notesDirectory, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

