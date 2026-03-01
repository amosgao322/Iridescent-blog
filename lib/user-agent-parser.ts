export interface ParsedUserAgent {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  isWeChat?: boolean;
  isWeibo?: boolean;
  isQQ?: boolean;
  networkType?: string;
  language?: string;
  raw: string;
}

export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) {
    return {
      browser: '未知',
      os: '未知',
      deviceType: 'unknown',
      raw: ua || '(空)',
    };
  }

  const result: ParsedUserAgent = {
    browser: '未知',
    os: '未知',
    deviceType: 'unknown',
    raw: ua,
  };

  // 检测微信
  if (ua.includes('MicroMessenger')) {
    result.isWeChat = true;
    result.browser = '微信';
    const wechatMatch = ua.match(/MicroMessenger\/([\d.]+)/);
    if (wechatMatch) {
      result.browserVersion = wechatMatch[1];
    }
  }
  // 检测微博
  else if (ua.includes('Weibo')) {
    result.isWeibo = true;
    result.browser = '微博';
  }
  // 检测QQ浏览器
  else if (ua.includes('QQ/') || ua.includes('MQQBrowser')) {
    result.isQQ = true;
    result.browser = 'QQ浏览器';
    const qqMatch = ua.match(/QQ\/([\d.]+)/);
    if (qqMatch) {
      result.browserVersion = qqMatch[1];
    }
  }
  // 检测Chrome
  else if (ua.includes('Chrome')) {
    result.browser = 'Chrome';
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
      result.browserVersion = chromeMatch[1];
    }
  }
  // 检测Safari
  else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    result.browser = 'Safari';
    const safariMatch = ua.match(/Version\/([\d.]+)/);
    if (safariMatch) {
      result.browserVersion = safariMatch[1];
    }
  }
  // 检测Firefox
  else if (ua.includes('Firefox')) {
    result.browser = 'Firefox';
    const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
    if (firefoxMatch) {
      result.browserVersion = firefoxMatch[1];
    }
  }
  // 检测Edge
  else if (ua.includes('Edg')) {
    result.browser = 'Edge';
    const edgeMatch = ua.match(/Edg\/([\d.]+)/);
    if (edgeMatch) {
      result.browserVersion = edgeMatch[1];
    }
  }

  // 检测操作系统
  if (ua.includes('Android')) {
    result.os = 'Android';
    const androidMatch = ua.match(/Android ([\d.]+)/);
    if (androidMatch) {
      result.osVersion = androidMatch[1];
    }
    result.deviceType = 'mobile';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = ua.includes('iPad') ? 'iPadOS' : 'iOS';
    const iosMatch = ua.match(/OS ([\d_]+)/);
    if (iosMatch) {
      result.osVersion = iosMatch[1].replace(/_/g, '.');
    }
    result.deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
  } else if (ua.includes('Windows')) {
    result.os = 'Windows';
    if (ua.includes('Windows NT 10.0')) {
      result.osVersion = '10/11';
    } else if (ua.includes('Windows NT 6.3')) {
      result.osVersion = '8.1';
    } else if (ua.includes('Windows NT 6.2')) {
      result.osVersion = '8';
    } else if (ua.includes('Windows NT 6.1')) {
      result.osVersion = '7';
    }
    result.deviceType = 'desktop';
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    result.os = 'macOS';
    const macMatch = ua.match(/Mac OS X ([\d_]+)/);
    if (macMatch) {
      result.osVersion = macMatch[1].replace(/_/g, '.');
    }
    result.deviceType = 'desktop';
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
    result.deviceType = 'desktop';
  }

  // 检测设备型号（Android）
  if (ua.includes('Build/')) {
    const buildMatch = ua.match(/([A-Z0-9]+)\s+Build/);
    if (buildMatch) {
      result.device = buildMatch[1];
    }
  }

  // 检测网络类型（微信特有）
  const networkMatch = ua.match(/NetType\/(\w+)/);
  if (networkMatch) {
    result.networkType = networkMatch[1];
  }

  // 检测语言
  const langMatch = ua.match(/Language\/([\w-]+)/);
  if (langMatch) {
    result.language = langMatch[1];
  }

  return result;
}

export function formatUserAgent(parsed: ParsedUserAgent): string {
  const parts: string[] = [];

  // 浏览器信息
  if (parsed.browser !== '未知') {
    let browserInfo = parsed.browser;
    if (parsed.browserVersion) {
      browserInfo += ` ${parsed.browserVersion}`;
    }
    parts.push(browserInfo);
  }

  // 操作系统信息
  if (parsed.os !== '未知') {
    let osInfo = parsed.os;
    if (parsed.osVersion) {
      osInfo += ` ${parsed.osVersion}`;
    }
    parts.push(osInfo);
  }

  // 设备信息
  if (parsed.device) {
    parts.push(`设备: ${parsed.device}`);
  }

  // 设备类型
  const deviceTypeMap: Record<string, string> = {
    mobile: '移动设备',
    desktop: '桌面设备',
    tablet: '平板设备',
  };
  if (parsed.deviceType !== 'unknown') {
    parts.push(deviceTypeMap[parsed.deviceType] || parsed.deviceType);
  }

  // 网络类型
  if (parsed.networkType) {
    const networkMap: Record<string, string> = {
      WIFI: 'WiFi',
      '2G': '2G网络',
      '3G': '3G网络',
      '4G': '4G网络',
      '5G': '5G网络',
    };
    parts.push(`网络: ${networkMap[parsed.networkType] || parsed.networkType}`);
  }

  // 语言
  if (parsed.language) {
    const langMap: Record<string, string> = {
      'zh_CN': '简体中文',
      'zh_TW': '繁体中文',
      'en': 'English',
    };
    parts.push(`语言: ${langMap[parsed.language] || parsed.language}`);
  }

  return parts.length > 0 ? parts.join(' · ') : parsed.raw;
}

