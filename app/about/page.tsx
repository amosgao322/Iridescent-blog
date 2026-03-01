import { getAboutContent } from '@/lib/about';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';
import ImageGallery from '@/components/about/ImageGallery';
import SkillsSection from '@/components/about/SkillsSection';
import ContactSection from '@/components/about/ContactSection';

// 强制动态渲染，确保能读取到更新的内容
export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const aboutContent = getAboutContent();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* 顶部头像区域 - 大图展示 */}
      {aboutContent.avatar && (
        <div className="mb-12 -mx-4 md:-mx-8">
          <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
            <img
              src={aboutContent.avatar}
              alt={aboutContent.name || '头像'}
              className="w-full h-full object-cover animate-fade-in-up"
            />
            {/* 底部渐隐遮罩 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* 名称和简介 */}
      <div className="mb-16 text-center">
        {aboutContent.name && (
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {aboutContent.name}
          </h1>
        )}
        {aboutContent.bio && (
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {aboutContent.bio}
          </p>
        )}
      </div>

      {/* 内容区域 */}
      {aboutContent.content && (
        <div className="mb-16">
          <div className="prose prose-lg max-w-none bg-white rounded-lg shadow-sm p-8 md:p-12">
            <MarkdownRenderer content={aboutContent.content} />
          </div>
        </div>
      )}

      {/* 技能标签 */}
      {aboutContent.skills && aboutContent.skills.length > 0 && (
        <SkillsSection skills={aboutContent.skills} />
      )}

      {/* 联系方式 */}
      {aboutContent.contact && (
        <ContactSection contact={aboutContent.contact} />
      )}

      {/* 图片画廊 */}
      {aboutContent.images && aboutContent.images.length > 0 && (
        <ImageGallery images={aboutContent.images} title="我的图库" />
      )}
    </div>
  );
}

