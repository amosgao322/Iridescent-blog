import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPostBySlug } from '@/lib/posts';

const postsDirectory = path.join(process.cwd(), 'content/posts');

// 获取单个文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const post = getPostBySlug(resolvedParams.slug);

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: '获取文章失败' },
      { status: 500 }
    );
  }
}

// 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { title, content, date, category, tags, series, coverImage, coverImageCaption, excerpt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    const oldPost = getPostBySlug(resolvedParams.slug);
    if (!oldPost) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    // 构建 front matter
    const frontMatter = {
      title,
      date: date || oldPost.date,
      category: category || '未分类',
      tags: tags || [],
      ...(series && { series }),
      ...(coverImage && { coverImage }),
      ...(coverImageCaption && { coverImageCaption }),
      ...(excerpt && { excerpt }),
    };

    // 组合完整的 Markdown 内容
    const markdownContent = matter.stringify(content, frontMatter);

    // 写入文件（使用原有的 slug，不改变文件名）
    const filePath = path.join(postsDirectory, `${resolvedParams.slug}.md`);
    fs.writeFileSync(filePath, markdownContent, 'utf8');

    return NextResponse.json({ success: true, slug: resolvedParams.slug });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: '更新文章失败' },
      { status: 500 }
    );
  }
}

// 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const filePath = path.join(postsDirectory, `${resolvedParams.slug}.md`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    );
  }
}

