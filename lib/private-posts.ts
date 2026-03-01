import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { extractImageUrl, countWordsExcludingImages } from './utils';

const privatePostsDirectory = path.join(process.cwd(), 'content/private-posts');

export interface PrivatePost {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  readingTime: number;
  wordCount: number;
}

// 确保目录存在
function ensureDirectoryExists() {
  if (!fs.existsSync(privatePostsDirectory)) {
    fs.mkdirSync(privatePostsDirectory, { recursive: true });
  }
}

export function getAllPrivatePosts(): PrivatePost[] {
  ensureDirectoryExists();
  
  if (!fs.existsSync(privatePostsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(privatePostsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md') && fileName !== '.md')
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(privatePostsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      const stats = readingTime(content);
      const wordCount = countWordsExcludingImages(content); // 中文字数统计（排除图片链接）

      let dateStr = '';
      if (data.date) {
        if (data.date instanceof Date) {
          dateStr = data.date.toISOString().split('T')[0];
        } else {
          dateStr = String(data.date);
        }
      }

      return {
        slug,
        title: data.title || '',
        date: dateStr,
        excerpt: data.excerpt,
        content,
        coverImage: extractImageUrl(data.coverImage),
        readingTime: Math.ceil(stats.minutes),
        wordCount,
      } as PrivatePost;
    });

  // 按日期排序，最新的在前
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getPrivatePostBySlug(slug: string): PrivatePost | null {
  ensureDirectoryExists();
  
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    decodedSlug = slug;
  }

  let fullPath = path.join(privatePostsDirectory, `${decodedSlug}.md`);
  
  if (!fs.existsSync(fullPath)) {
    const fileNames = fs.readdirSync(privatePostsDirectory);
    const matchingFile = fileNames.find((fileName) => {
      if (!fileName.endsWith('.md') || fileName === '.md') return false;
      const fileSlug = fileName.replace(/\.md$/, '');
      try {
        const decodedFileSlug = decodeURIComponent(fileSlug);
        return decodedFileSlug === decodedSlug || fileSlug === decodedSlug;
      } catch {
        return fileSlug === decodedSlug;
      }
    });

    if (matchingFile) {
      fullPath = path.join(privatePostsDirectory, matchingFile);
    } else {
      return null;
    }
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const stats = readingTime(content);
  const wordCount = content.replace(/\s/g, '').length;

  let dateStr = '';
  if (data.date) {
    if (data.date instanceof Date) {
      dateStr = data.date.toISOString().split('T')[0];
    } else {
      dateStr = String(data.date);
    }
  }

  return {
    slug,
    title: data.title || '',
    date: dateStr,
    excerpt: data.excerpt,
    content,
    coverImage: extractImageUrl(data.coverImage),
    readingTime: Math.ceil(stats.minutes),
    wordCount,
  } as PrivatePost;
}

