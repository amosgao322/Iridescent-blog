import fs from 'fs';
import path from 'path';

const commentsFilePath = path.join(process.cwd(), 'content/comments.json');

export interface Comment {
  id: string;
  postSlug: string;
  nickname: string;
  email: string;
  content: string;
  likes: number;
  createdAt: number;
  updatedAt: number;
}

// 确保文件存在
function ensureFileExists() {
  const dir = path.dirname(commentsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(commentsFilePath)) {
    fs.writeFileSync(commentsFilePath, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllComments(): Comment[] {
  ensureFileExists();
  
  if (!fs.existsSync(commentsFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(commentsFilePath, 'utf8');
    const comments = JSON.parse(fileContents) as Comment[];
    // 按创建时间倒序排列（最新的在前）
    return comments.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error reading comments file:', error);
    return [];
  }
}

export function getCommentsByPostSlug(postSlug: string): Comment[] {
  const allComments = getAllComments();
  return allComments.filter(comment => comment.postSlug === postSlug);
}

export function getCommentById(id: string): Comment | null {
  const comments = getAllComments();
  return comments.find(c => c.id === id) || null;
}

export function createComment(
  postSlug: string,
  nickname: string,
  email: string,
  content: string
): string {
  ensureFileExists();
  
  const comments = getAllComments();
  const id = Date.now().toString();
  const newComment: Comment = {
    id,
    postSlug,
    nickname,
    email,
    content,
    likes: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  comments.push(newComment);
  fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2), 'utf8');

  return id;
}

export function likeComment(id: string): boolean {
  ensureFileExists();
  
  const comments = getAllComments();
  const index = comments.findIndex(c => c.id === id);
  
  if (index === -1) {
    return false;
  }

  comments[index] = {
    ...comments[index],
    likes: (comments[index].likes || 0) + 1,
    updatedAt: Date.now(),
  };

  fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2), 'utf8');
  return true;
}

