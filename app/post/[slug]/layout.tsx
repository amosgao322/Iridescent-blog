// 文章详情页不需要单独的layout，由根layout处理
export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

