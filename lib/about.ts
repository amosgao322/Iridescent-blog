import fs from 'fs';
import path from 'path';

const aboutFilePath = path.join(process.cwd(), 'content/about.json');

export interface AboutImage {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string; // 缩略图URL，如果未提供则使用url
}

export interface ContactInfo {
  wechat?: string; // 微信
  email?: string; // 邮箱
  github?: string; // GitHub
  zhihu?: string; // 知乎
  bilibili?: string; // B站
}

export interface AboutContent {
  content: string;
  updatedAt: number;
  // 新增字段
  avatar?: string; // 头像URL
  name?: string; // 名称
  bio?: string; // 简介
  images?: AboutImage[]; // 图片数组
  skills?: string[]; // 技能标签数组
  contact?: ContactInfo; // 联系方式
}

// 确保文件存在
function ensureFileExists() {
  const dir = path.dirname(aboutFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(aboutFilePath)) {
    const defaultContent: AboutContent = {
      content: '这里是关于我的内容...',
      updatedAt: Date.now(),
      images: [],
    };
    fs.writeFileSync(aboutFilePath, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

// 获取关于内容
export function getAboutContent(): AboutContent {
  ensureFileExists();
  
  if (!fs.existsSync(aboutFilePath)) {
    return {
      content: '这里是关于我的内容...',
      updatedAt: Date.now(),
      images: [],
    };
  }

  try {
    const fileContents = fs.readFileSync(aboutFilePath, 'utf8');
    const data = JSON.parse(fileContents) as AboutContent;
    return data;
  } catch (error) {
    console.error('Error reading about file:', error);
    return {
      content: '这里是关于我的内容...',
      updatedAt: Date.now(),
      images: [],
    };
  }
}

// 更新关于内容（支持完整对象或仅内容字符串，向后兼容）
export function updateAboutContent(data: string | Partial<AboutContent>): boolean {
  ensureFileExists();
  
  try {
    const existing = getAboutContent();
    
    let aboutContent: AboutContent;
    
    // 如果传入的是字符串，保持向后兼容
    if (typeof data === 'string') {
      aboutContent = {
        ...existing,
        content: data,
        updatedAt: Date.now(),
      };
    } else {
      // 如果传入的是对象，合并更新
      aboutContent = {
        ...existing,
        ...data,
        updatedAt: Date.now(),
      };
    }
    
    fs.writeFileSync(aboutFilePath, JSON.stringify(aboutContent, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error updating about file:', error);
    return false;
  }
}

