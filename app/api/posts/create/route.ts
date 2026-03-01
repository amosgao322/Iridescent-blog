import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { generateSlugFromTitle } from '@/lib/utils';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, date, category, tags, series, coverImage, coverImageCaption, excerpt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 确保目录存在
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true });
    }

    // 生成 slug（从标题生成）
    const slug = generateSlugFromTitle(title);

    // 构建 front matter
    const frontMatter = {
      title,
      date: date || new Date().toISOString().split('T')[0],
      category: category || '未分类',
      tags: tags || [],
      ...(series && { series }),
      ...(coverImage && { coverImage }),
      ...(coverImageCaption && { coverImageCaption }),
      ...(excerpt && { excerpt }),
    };

    // 组合完整的 Markdown 内容
    const markdownContent = matter.stringify(content, frontMatter);

    // 写入文件
    const filePath = path.join(postsDirectory, `${slug}.md`);
    fs.writeFileSync(filePath, markdownContent, 'utf8');

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    );
  }
}

