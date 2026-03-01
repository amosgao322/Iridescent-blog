import { ContactInfo } from '@/lib/about';

interface ContactSectionProps {
  contact?: ContactInfo;
  title?: string;
}

export default function ContactSection({ contact, title = '联系方式' }: ContactSectionProps) {
  if (!contact) return null;

  const contactItems = [
    { key: 'wechat', label: '微信', icon: '💬', value: contact.wechat },
    { key: 'email', label: '邮箱', icon: '📧', value: contact.email, isLink: true, href: `mailto:${contact.email}` },
    { key: 'github', label: 'GitHub', icon: '💻', value: contact.github, isLink: true, href: contact.github },
    { key: 'zhihu', label: '知乎', icon: '📝', value: contact.zhihu, isLink: true, href: contact.zhihu },
    { key: 'bilibili', label: 'B站', icon: '📺', value: contact.bilibili, isLink: true, href: contact.bilibili },
  ].filter(item => item.value);

  if (contactItems.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {contactItems.map((item) => (
          <div
            key={item.key}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">{item.label}</div>
                {item.isLink && item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {item.value}
                  </a>
                ) : (
                  <div className="text-gray-800 break-all">{item.value}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

