# 检查 Nginx 配置

## 1. 检查宿主机上的 Nginx 配置文件位置

```bash
# 查找 nginx 配置文件
sudo find /etc -name "nginx.conf" 2>/dev/null
sudo find /etc/nginx -name "*.conf" 2>/dev/null | head -10

# 或者检查常见的配置文件位置
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/
```

## 2. 查看 Nginx 配置中是否设置了必要的 Header

```bash
# 查看包含 gaohuaiyu.vip 的配置
sudo grep -r "gaohuaiyu.vip" /etc/nginx/ 2>/dev/null

# 查看包含 X-Real-IP 的配置
sudo grep -r "X-Real-IP" /etc/nginx/ 2>/dev/null

# 查看包含 X-Forwarded-Proto 的配置
sudo grep -r "X-Forwarded-Proto" /etc/nginx/ 2>/dev/null
```

## 3. 检查 Nginx 配置是否正确设置了所有必要的 Header

关键检查点：
- `proxy_set_header X-Real-IP $remote_addr;` - 必须设置
- `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` - 必须设置
- `proxy_set_header X-Forwarded-Proto https;` - HTTPS 必须设置为 `https`（不能是 `$scheme`）

## 4. 检查是否有访问记录被创建

```bash
# 查看最近的访问记录（最后10条）
docker exec iridescent-blog sh -c "cat /app/content/analytics.json | jq '.visits[-10:] | .[] | {ip, path, timestamp: (.timestamp | todateiso8601)}'"

# 查看是否有 RecordVisit 日志
docker logs iridescent-blog 2>&1 | grep -i "RecordVisit\|Visit created" | tail -20
```

## 5. 检查 middleware 是否被触发

```bash
# 查看 middleware 相关日志（如果有的话）
docker logs iridescent-blog 2>&1 | grep -i "middleware\|recordVisit" | tail -20
```

## 6. 测试内部 API 调用

```bash
# 在容器内测试内部 API
docker exec iridescent-blog curl -X POST http://localhost:3000/api/analytics/record \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true" \
  -d '{"ip":"127.0.0.1","path":"/test","userAgent":"test-agent"}'

# 检查是否创建了记录
docker exec iridescent-blog tail -20 /app/content/analytics.json
```

