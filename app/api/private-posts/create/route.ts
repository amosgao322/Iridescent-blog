import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { generateSlugFromTitle } from '@/lib/utils';

const privatePostsDirectory = path.join(process.cwd(), 'content/private-posts');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, date, coverImage, excerpt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 确保目录存在
    if (!fs.existsSync(privatePostsDirectory)) {
      fs.mkdirSync(privatePostsDirectory, { recursive: true });
    }

    // 生成 slug（从标题生成）
    const slug = generateSlugFromTitle(title);

    // 构建 front matter（简化版，无分类标签）
    const frontMatter = {
      title,
      date: date || new Date().toISOString().split('T')[0],
      ...(coverImage && { coverImage }),
      ...(excerpt && { excerpt }),
    };

    // 组合完整的 Markdown 内容
    const markdownContent = matter.stringify(content, frontMatter);

    // 写入文件
    const filePath = path.join(privatePostsDirectory, `${slug}.md`);
    fs.writeFileSync(filePath, markdownContent, 'utf8');

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error creating private post:', error);
    return NextResponse.json(
      { error: '创建私密文章失败' },
      { status: 500 }
    );
  }
}

