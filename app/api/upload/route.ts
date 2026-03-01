import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadToCOS } from '@/lib/cos';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: '没有文件' },
        { status: 400 }
      );
    }

    if (type === 'image' || type === 'video') {
      // 上传图片或视频到腾讯云 COS
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      // 上传路径：可以通过环境变量自定义
      const uploadPath = type === 'video' 
        ? (process.env.COS_VIDEO_PATH || 'videos')
        : (process.env.COS_IMAGE_PATH || 'images');
      const key = `${uploadPath}/${fileName}`;

      const url = await uploadToCOS({
        Key: key,
        Body: buffer,
        ContentType: file.type,
      });

      return NextResponse.json({ url, key });
    } else if (type === 'markdown') {
      // 保存 Markdown 文件到服务器
      const postsDirectory = path.join(process.cwd(), 'content/posts');
      
      // 确保目录存在
      await mkdir(postsDirectory, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name;
      const filePath = path.join(postsDirectory, fileName);

      await writeFile(filePath, buffer);

      return NextResponse.json({
        url: `/content/posts/${fileName}`,
        message: 'Markdown 文件已保存',
      });
    } else {
      return NextResponse.json(
        { error: '不支持的文件类型' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    );
  }
}

