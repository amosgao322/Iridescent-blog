import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/posts';
import { getAllNotes } from '@/lib/notes';

export async function GET() {
  try {
    const posts = getAllPosts();
    const notes = getAllNotes();
    
    // 合并文章和随记，按日期排序
    const allItems = [
      ...posts.map(post => {
        // 对slug进行URL编码
        const encodedSlug = encodeURIComponent(post.slug);
        return {
          title: post.title,
          link: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/post/${encodedSlug}`,
          description: post.excerpt || post.content.substring(0, 200).replace(/[#*\[\]()]/g, ''),
          date: new Date(post.date).toISOString(),
          type: 'post',
        };
      }),
      ...notes.map(note => ({
        title: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
        link: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/notes`,
        description: note.content,
        date: new Date(note.createdAt).toISOString(),
        type: 'note',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const siteTitle = '高槐玉的独立空间';
    const siteDescription = 'Live Young n Act Now.';

    // 转义XML特殊字符
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed" rel="self" type="application/rss+xml"/>
    ${allItems.slice(0, 20).map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${escapeXml(item.link)}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
    </item>`).join('')}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating RSS:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}

