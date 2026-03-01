# Iridescent Blog

一个基于 Next.js 的个人博客系统，支持 Markdown 文章、图片上传、搜索等功能。

## 功能特性

- ✅ Markdown 文章管理
- ✅ 可视化编辑器
- ✅ 腾讯云 COS 图片上传
- ✅ 文章搜索
- ✅ 归档、图库、关于页
- ✅ 简单密码认证
- ✅ Docker 部署

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **Markdown**: remark + rehype
- **搜索**: flexsearch
- **部署**: Docker + Nginx

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

需要配置的变量：
- `ADMIN_PASSWORD`: 后台管理密码
- `COS_SECRET_ID`: 腾讯云 COS SecretId
- `COS_SECRET_KEY`: 腾讯云 COS SecretKey
- `COS_BUCKET`: COS 存储桶名称
- `COS_REGION`: COS 区域（默认：ap-guangzhou）

### 3. 开发运行

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## Docker 部署

### 1. 构建镜像

```bash
cd docker
docker-compose build
```

### 2. 配置环境变量

在 `docker/docker-compose.yml` 同级目录创建 `.env` 文件，或直接在 `docker-compose.yml` 中修改环境变量。

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 查看日志

```bash
docker-compose logs -f
```

## 项目结构

```
Iridescent-blog/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── post/[slug]/       # 文章详情
│   ├── archive/           # 归档页
│   ├── gallery/           # 图库页
│   ├── about/             # 关于页
│   ├── admin/             # 后台管理
│   └── api/                 # API 路由
├── components/             # React 组件
├── content/                # Markdown 文件
│   └── posts/             # 文章目录
├── lib/                    # 工具函数
├── docker/                 # Docker 配置
└── public/                 # 静态资源
```

## 使用说明

### 创建文章

1. 访问 `/admin` 登录后台
2. 点击"文章编辑器"
3. 填写文章信息和内容
4. 保存文章

### 上传图片

1. 访问 `/admin/upload`
2. 选择"图片"类型
3. 选择图片文件
4. 点击上传（会自动上传到腾讯云 COS）
5. 复制返回的 URL 用于文章

### 上传 Markdown 文件

1. 访问 `/admin/upload`
2. 选择"Markdown 文件"类型
3. 选择 `.md` 文件
4. 点击上传（保存到服务器 `content/posts/` 目录）

## 文章格式

文章使用 Markdown 格式，支持 Front Matter：

```markdown
---
title: 文章标题
date: 2025-01-12
category: 生活
tags: [旅行, 摄影]
series: 旅行
coverImage: https://example.com/image.jpg
excerpt: 文章摘要
---

文章内容...
```

## 开发计划

- [ ] Gitalk 评论系统集成
- [ ] 图库功能完善
- [ ] RSS 订阅
- [ ] 文章统计优化
- [ ] 图片压缩和优化

## License

ISC

