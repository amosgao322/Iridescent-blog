/**
 * apihz.cn IP 归属地查询（用于统计 V2 用户列表地理位置）
 * 请求：POST https://cn.apihz.cn/api/ip/chaapi.php
 * Content-Type: application/x-www-form-urlencoded，body: id, key, ip
 * 成功：code=200，返回 guo/sheng/shi/qu/isp 等
 */

export interface ApiHzIPLocationResponse {
  code: number;
  msg?: string;
  zhou?: string;
  guo?: string;
  sheng?: string;
  shi?: string;
  qu?: string;
  isp?: string;
  ip?: string;
}

export interface NormalizedIPLocation {
  country?: string;
  region?: string;
  city?: string;
  /** 区县（apihz 返回的 qu） */
  district?: string;
  isp?: string;
}

const APIHZ_URL = 'https://cn.apihz.cn/api/ip/chaapi.php';
const DEFAULT_TIMEOUT_MS = 5000;
/** 成功结果缓存 1 小时，避免同一 IP 被重复请求导致频次超限 */
const CACHE_TTL_SUCCESS_MS = 60 * 60 * 1000;
/** 失败结果缓存 1 分钟，避免限流后继续狂请求同一 IP */
const CACHE_TTL_FAIL_MS = 60 * 1000;

const cache = new Map<string, { location: NormalizedIPLocation | null; expiresAt: number }>();

function getCached(ip: string): NormalizedIPLocation | null | undefined {
  const entry = cache.get(ip);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(ip);
    return undefined;
  }
  return entry.location;
}

function setCache(ip: string, location: NormalizedIPLocation | null, isSuccess: boolean): void {
  const ttl = isSuccess ? CACHE_TTL_SUCCESS_MS : CACHE_TTL_FAIL_MS;
  cache.set(ip, { location, expiresAt: Date.now() + ttl });
}

/**
 * 调用 apihz IP 查询接口（POST），返回归一化后的地理位置信息
 * 同一 IP 在缓存有效期内不重复请求，避免超出接口频次限制（如 10 次/分钟）
 * 需配置环境变量：APIHZ_IP_ID、APIHZ_IP_KEY
 */
export async function getIPLocation(
  ip: string,
  options?: { timeoutMs?: number }
): Promise<NormalizedIPLocation | null> {
  const id = process.env.APIHZ_IP_ID;
  const key = process.env.APIHZ_IP_KEY;

  if (!id || !key) {
    console.warn('[IP Location] ApiHz config missing: APIHZ_IP_ID or APIHZ_IP_KEY not set, skip ip=', ip);
    return null;
  }

  const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  if (!ip || ip === 'unknown' || !ipv4Regex.test(ip)) {
    console.warn('[IP Location] ApiHz skip: invalid ip (empty/unknown/not ipv4), ip=', ip);
    return null;
  }

  const cached = getCached(ip);
  if (cached !== undefined) return cached;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = new URLSearchParams({
    id,
    key,
    ip,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(APIHZ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = (await res.json()) as ApiHzIPLocationResponse;
    if (json.code !== 200) {
      console.warn('[IP Location] ApiHz business error: code=', json.code, 'msg=', json.msg ?? '(empty)', 'ip=', ip);
      setCache(ip, null, false);
      return null;
    }

    const country = json.guo;
    const region = json.sheng;
    const city = json.shi;
    const district = json.qu;
    const isp = json.isp;

    const hasAny = [country, region, city, district, isp].some(Boolean);
    if (!hasAny) {
      console.warn('[IP Location] ApiHz code=200 but no location fields (guo/sheng/shi/qu/isp), ip=', ip);
      setCache(ip, null, false);
      return null;
    }

    const location: NormalizedIPLocation = {
      country: country || undefined,
      region: region || undefined,
      city: city || undefined,
      district: district || undefined,
      isp: isp || undefined,
    };
    setCache(ip, location, true);
    return location;
  } catch (e) {
    clearTimeout(timeoutId);
    const err = e instanceof Error ? e : new Error(String(e));
    const isTimeout = err.name === 'AbortError';
    console.warn(
      '[IP Location] ApiHz request failed:',
      isTimeout ? 'timeout' : err.name || 'Error',
      'message=',
      err.message,
      'ip=',
      ip
    );
    setCache(ip, null, false);
    return null;
  }
}
