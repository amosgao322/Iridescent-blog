import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { extractImageUrl, countWordsExcludingImages } from './utils';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  series?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  coverImageCaption?: string;
  readingTime: number;
  wordCount: number;
  imageCount?: number;
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md') && fileName !== '.md') // 排除空文件名
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      const stats = readingTime(content);
      const wordCount = countWordsExcludingImages(content); // 中文字数统计（排除图片链接）

      // 确保 date 是字符串格式
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
        category: data.category || '未分类',
        tags: data.tags || [],
        series: data.series,
        excerpt: data.excerpt,
        content,
        coverImage: extractImageUrl(data.coverImage),
        coverImageCaption: data.coverImageCaption,
        readingTime: Math.ceil(stats.minutes),
        wordCount,
        imageCount: data.imageCount,
      } as Post;
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

export function getPostBySlug(slug: string): Post | null {
  // 解码 URL 编码的 slug（Next.js 可能已经解码，但为了安全还是处理一下）
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    // 如果解码失败，使用原始 slug
    decodedSlug = slug;
  }

  // 尝试直接查找
  let fullPath = path.join(postsDirectory, `${decodedSlug}.md`);
  
  if (!fs.existsSync(fullPath)) {
    // 如果直接查找失败，尝试在所有文件中查找匹配的
    // 因为文件名可能包含中文字符，而 URL 中的 slug 可能被编码
    const fileNames = fs.readdirSync(postsDirectory);
    const matchingFile = fileNames.find((fileName) => {
      if (!fileName.endsWith('.md') || fileName === '.md') return false;
      const fileSlug = fileName.replace(/\.md$/, '');
      // 尝试解码文件名中的 slug
      try {
        const decodedFileSlug = decodeURIComponent(fileSlug);
        return decodedFileSlug === decodedSlug || fileSlug === decodedSlug;
      } catch {
        return fileSlug === decodedSlug;
      }
    });

    if (matchingFile) {
      fullPath = path.join(postsDirectory, matchingFile);
    } else {
      return null;
    }
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const stats = readingTime(content);
  const wordCount = countWordsExcludingImages(content); // 中文字数统计（排除图片链接）

  // 确保 date 是字符串格式
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
    category: data.category || '未分类',
    tags: data.tags || [],
    series: data.series,
    excerpt: data.excerpt,
    content,
    coverImage: extractImageUrl(data.coverImage),
    coverImageCaption: data.coverImageCaption,
    readingTime: Math.ceil(stats.minutes),
    wordCount,
    imageCount: data.imageCount,
  } as Post;
}

export function getPostsByCategory(category: string): Post[] {
  return getAllPosts().filter((post) => post.category === category);
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) => post.tags.includes(tag));
}

export function getPostsBySeries(series: string): Post[] {
  return getAllPosts().filter((post) => post.series === series);
}

