/**
 * 路径到中文名称的映射
 */
export const pathNameMap: Record<string, string> = {
  '/': '首页',
  '/about': '关于',
  '/archive': '归档',
  '/gallery': '图库',
  '/friends': '邻居',
  '/notes': '随记',
  '/posts': '文章',
  '/movies': '光影',
  '/admin': '后台管理',
  '/admin/editor': '文章编辑器',
  '/admin/upload': '文件上传',
  '/admin/posts': '文章管理',
  '/admin/notes': '随记管理',
  '/admin/movies': '电影管理',
  '/admin/friends': '友链管理',
  '/admin/analytics': '访问统计',
  '/admin/private-posts': '私密文章管理',
  '/admin/private-editor': '私密文章编辑器',
  '/rss': 'RSS订阅',
};

/**
 * 获取路径的中文名称
 */
export function getPathName(path: string): string {
  // 直接匹配
  if (pathNameMap[path]) {
    return pathNameMap[path];
  }
  
  // 匹配文章详情页 /post/[slug]
  if (path.startsWith('/post/')) {
    return '文章详情';
  }
  
  // 匹配私密文章 /private/[slug]
  if (path.startsWith('/private/')) {
    return '私密文章';
  }
  
  // 匹配其他管理页面
  if (path.startsWith('/admin/')) {
    return '后台管理';
  }
  
  // 默认返回路径本身
  return path || '/';
}

