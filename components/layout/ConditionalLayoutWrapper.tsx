'use client';

import { usePathname } from 'next/navigation';

interface ConditionalLayoutWrapperProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function ConditionalLayoutWrapper({
  children,
  sidebar,
}: ConditionalLayoutWrapperProps) {
  const pathname = usePathname();
  const isPostPage = pathname?.startsWith('/post/');
  const isAnalyticsPage = pathname?.startsWith('/admin/analytics');
  const isAboutPage = pathname === '/about';

  if (isPostPage || isAnalyticsPage || isAboutPage) {
    // 文章详情页、访问统计页和关于页：不显示侧边栏
    // 移动端移除左右 padding，让内容占满整个宽度
    return (
      <div className="w-full py-8">
        <main className="max-w-full">
          {children}
        </main>
      </div>
    );
  }

  // 其他页面：显示侧边栏
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8">
          {children}
        </main>
        <aside className="lg:col-span-4">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}

