/**
 * 一次性测试：apihz POST 查询 IP 归属地
 * 使用方式：node scripts/test-ip-apihz.js [IP]
 * 示例：node scripts/test-ip-apihz.js 58.250.8.122
 */
const url = 'https://cn.apihz.cn/api/ip/chaapi.php';
const id = process.env.APIHZ_IP_ID || '10013350';
const key = process.env.APIHZ_IP_KEY || '17e8ff34c56739368d2c0ffd47747b38';
const ip = process.argv[2] || '58.250.8.122';

const body = new URLSearchParams({ id, key, ip });

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
})
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)))
  .catch((e) => console.error('Error:', e.message));
