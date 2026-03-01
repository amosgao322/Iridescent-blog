import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPrivatePostBySlug } from '@/lib/private-posts';

const privatePostsDirectory = path.join(process.cwd(), 'content/private-posts');

// 获取单个私密文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const post = getPrivatePostBySlug(resolvedParams.slug);

    if (!post) {
      return NextResponse.json(
        { error: '私密文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching private post:', error);
    return NextResponse.json(
      { error: '获取私密文章失败' },
      { status: 500 }
    );
  }
}

// 更新私密文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { title, content, date, coverImage, excerpt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    const oldPost = getPrivatePostBySlug(resolvedParams.slug);
    if (!oldPost) {
      return NextResponse.json(
        { error: '私密文章不存在' },
        { status: 404 }
      );
    }

    // 构建 front matter（简化版）
    const frontMatter = {
      title,
      date: date || oldPost.date,
      ...(coverImage && { coverImage }),
      ...(excerpt && { excerpt }),
    };

    // 组合完整的 Markdown 内容
    const markdownContent = matter.stringify(content, frontMatter);

    // 写入文件（使用原有的 slug，不改变文件名）
    const filePath = path.join(privatePostsDirectory, `${resolvedParams.slug}.md`);
    fs.writeFileSync(filePath, markdownContent, 'utf8');

    return NextResponse.json({ success: true, slug: resolvedParams.slug });
  } catch (error) {
    console.error('Error updating private post:', error);
    return NextResponse.json(
      { error: '更新私密文章失败' },
      { status: 500 }
    );
  }
}

// 删除私密文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const filePath = path.join(privatePostsDirectory, `${resolvedParams.slug}.md`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: '私密文章不存在' },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting private post:', error);
    return NextResponse.json(
      { error: '删除私密文章失败' },
      { status: 500 }
    );
  }
}

