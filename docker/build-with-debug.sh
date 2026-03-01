#!/bin/sh
# 不使用 set -e，以便我们可以捕获和处理错误
set +e

LOG_FILE="/tmp/build-debug.log"

echo "=== Build Debug Script Started ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:8\",\"message\":\"Build script started\",\"data\":{\"pwd\":\"$(pwd)\",\"node_version\":\"$(node --version)\",\"npm_version\":\"$(npm --version)\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"A\"}" >> "$LOG_FILE"
# #endregion

echo "=== Checking Required Files ==="
PACKAGE_JSON_EXISTS=$(test -f package.json && echo 'exists' || echo 'missing')
NEXT_CONFIG_EXISTS=$(test -f next.config.js && echo 'exists' || echo 'missing')
TS_CONFIG_EXISTS=$(test -f tsconfig.json && echo 'exists' || echo 'missing')
NODE_MODULES_EXISTS=$(test -d node_modules && echo 'exists' || echo 'missing')
echo "package.json: $PACKAGE_JSON_EXISTS"
echo "next.config.js: $NEXT_CONFIG_EXISTS"
echo "tsconfig.json: $TS_CONFIG_EXISTS"
echo "node_modules: $NODE_MODULES_EXISTS"

echo ""
echo "=== Checking Environment Variables ==="
echo "NODE_ENV: ${NODE_ENV:-not_set}"
echo "NEXT_TELEMETRY_DISABLED: ${NEXT_TELEMETRY_DISABLED:-not_set}"

echo ""
echo "=== Verifying next.config.js ==="
if [ -f next.config.js ]; then
  echo "next.config.js content:"
  cat next.config.js
  echo ""
  if grep -q "output.*standalone" next.config.js || grep -q "standalone" next.config.js; then
    echo "✓ standalone output is configured in next.config.js"
  else
    echo "✗ WARNING: standalone output may not be configured!"
  fi
else
  echo "✗ ERROR: next.config.js not found!"
fi

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:11\",\"message\":\"Checking file existence\",\"data\":{\"package_json\":\"$PACKAGE_JSON_EXISTS\",\"next_config\":\"$NEXT_CONFIG_EXISTS\",\"tsconfig\":\"$TS_CONFIG_EXISTS\",\"node_modules\":\"$NODE_MODULES_EXISTS\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"B\"}" >> "$LOG_FILE"
# #endregion

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:14\",\"message\":\"Checking environment variables\",\"data\":{\"NODE_ENV\":\"${NODE_ENV:-not_set}\",\"NEXT_TELEMETRY_DISABLED\":\"${NEXT_TELEMETRY_DISABLED:-not_set}\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"C\"}" >> "$LOG_FILE"
# #endregion

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:17\",\"message\":\"Checking TypeScript compilation\",\"data\":{\"tsc_check\":\"starting\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"A\"}" >> "$LOG_FILE"
# #endregion

# 检查 TypeScript 编译
if command -v tsc >/dev/null 2>&1; then
  tsc --noEmit 2>&1 | tee /tmp/tsc-errors.log || true
  TSC_EXIT=$?
  # #region agent log
  echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:24\",\"message\":\"TypeScript check completed\",\"data\":{\"exit_code\":$TSC_EXIT},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"A\"}" >> "$LOG_FILE"
  # #endregion
fi

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:28\",\"message\":\"Starting npm build\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"D\"}" >> "$LOG_FILE"
# #endregion

# 运行构建并捕获输出
echo ""
echo "=== Starting Next.js Build ==="
echo "Command: npm run build"
echo "NODE_ENV: ${NODE_ENV}"
echo "Working directory: $(pwd)"
echo "Files in current directory:"
ls -la | head -20
echo ""

# 运行构建，同时输出到标准输出和文件
npm run build 2>&1 | tee /tmp/npm-build-output.log
BUILD_EXIT=$?
echo ""
echo "=== Build Exit Code: $BUILD_EXIT ==="

# 无论构建是否成功，都检查 .next 目录
echo ""
echo "=== Checking .next directory immediately after build ==="
if [ -d .next ]; then
  echo "✓ .next directory exists"
  echo "Directory structure:"
  find .next -type d -maxdepth 2 2>&1 | head -20
  echo ""
  echo "Top-level files in .next:"
  ls -la .next/ 2>&1 | head -20
else
  echo "✗ .next directory does NOT exist - build failed completely!"
fi

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:33\",\"message\":\"Build completed\",\"data\":{\"exit_code\":$BUILD_EXIT},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"D\"}" >> "$LOG_FILE"
# #endregion

# 将构建输出追加到日志文件
cat /tmp/npm-build-output.log >> "$LOG_FILE" 2>&1 || true

if [ $BUILD_EXIT -ne 0 ]; then
  # #region agent log
  echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:40\",\"message\":\"Build failed\",\"data\":{\"exit_code\":$BUILD_EXIT},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"ALL\"}" >> "$LOG_FILE"
  # #endregion
  echo ""
  echo "=== BUILD FAILED with exit code $BUILD_EXIT ==="
  echo ""
  echo "TypeScript errors (if any):"
  cat /tmp/tsc-errors.log 2>/dev/null || echo "No TypeScript errors file"
  echo ""
  echo "Last 100 lines of build output:"
  tail -100 /tmp/npm-build-output.log 2>&1 || echo "Cannot read build output"
  echo ""
  echo "Full build output saved to: /tmp/npm-build-output.log"
  echo ""
  # 即使构建失败，也继续检查 .next 目录（可能部分构建成功）
  echo "Continuing with diagnostics despite build failure..."
  echo ""
fi

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:50\",\"message\":\"Build succeeded, checking output directories\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"C\"}" >> "$LOG_FILE"
# #endregion

# 检查 .next 目录结构
echo "=== Checking Build Output ==="
NEXT_DIR_EXISTS=$(test -d .next && echo 'true' || echo 'false')
STANDALONE_EXISTS=$(test -d .next/standalone && echo 'true' || echo 'false')
STATIC_EXISTS=$(test -d .next/static && echo 'true' || echo 'false')
echo ".next directory exists: $NEXT_DIR_EXISTS"
echo ".next/standalone exists: $STANDALONE_EXISTS"
echo ".next/static exists: $STATIC_EXISTS"

if [ "$NEXT_DIR_EXISTS" = "true" ]; then
  echo "Contents of .next directory:"
  ls -la .next/ 2>&1 | head -30 || echo "Cannot list .next directory"
fi

# #region agent log
NEXT_CONTENTS=$(ls -la .next 2>/dev/null | head -20 || echo 'cannot_list')
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:56\",\"message\":\"Checking .next directory structure\",\"data\":{\"next_exists\":\"$NEXT_DIR_EXISTS\",\"standalone_exists\":\"$STANDALONE_EXISTS\",\"static_exists\":\"$STATIC_EXISTS\",\"next_contents\":\"$NEXT_CONTENTS\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"C\"}" >> "$LOG_FILE"
# #endregion

# 检查 next.config.js 中的 standalone 配置
# #region agent log
if [ -f next.config.js ]; then
  CONFIG_HAS_STANDALONE=$(grep -q "standalone" next.config.js && echo 'true' || echo 'false')
  CONFIG_CONTENT=$(cat next.config.js | head -20)
  echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:63\",\"message\":\"Checking next.config.js\",\"data\":{\"has_standalone\":\"$CONFIG_HAS_STANDALONE\",\"config_preview\":\"$CONFIG_CONTENT\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"B\"}" >> "$LOG_FILE"
else
  echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:65\",\"message\":\"next.config.js not found\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"B\"}" >> "$LOG_FILE"
fi
# #endregion

# 如果 standalone 目录不存在，列出 .next 目录内容以便调试
if [ "$STANDALONE_EXISTS" != "true" ]; then
  echo ""
  echo "=== CRITICAL ERROR: .next/standalone directory not found after build! ==="
  echo ""
  echo "Build exit code was: $BUILD_EXIT"
  if [ $BUILD_EXIT -ne 0 ]; then
    echo "NOTE: Build failed, which may explain why standalone is missing."
  else
    echo "WARNING: Build reported success, but standalone directory is missing!"
    echo "This may indicate a Next.js configuration issue."
  fi
  echo ""
  echo "=== Diagnostic Information ==="
  echo ""
  echo "1. Checking next.config.js:"
  if [ -f next.config.js ]; then
    echo "   Content:"
    cat next.config.js | sed 's/^/   /'
    echo ""
    if grep -qi "standalone" next.config.js; then
      echo "   ✓ 'standalone' found in next.config.js"
    else
      echo "   ✗ WARNING: 'standalone' not found in next.config.js"
    fi
  else
    echo "   ✗ ERROR: next.config.js not found!"
  fi
  echo ""
  echo "2. Checking .next directory:"
  if [ -d .next ]; then
    echo "   ✓ .next directory exists"
    echo ""
    echo "   Directory structure (maxdepth 3):"
    find .next -type d -maxdepth 3 2>&1 | head -30 | sed 's/^/   /'
    echo ""
    echo "   All files in .next (first 50):"
    find .next -type f 2>&1 | head -50 | sed 's/^/   /'
    echo ""
    echo "   Checking for common Next.js output directories:"
    test -d .next/server && echo "   ✓ .next/server exists" || echo "   ✗ .next/server missing"
    test -d .next/cache && echo "   ✓ .next/cache exists" || echo "   ✗ .next/cache missing"
    test -d .next/static && echo "   ✓ .next/static exists" || echo "   ✗ .next/static missing"
    test -d .next/standalone && echo "   ✓ .next/standalone exists" || echo "   ✗ .next/standalone missing"
  else
    echo "   ✗ .next directory does not exist - build completely failed!"
  fi
  echo ""
  echo "3. Last 100 lines of build output:"
  tail -100 /tmp/npm-build-output.log 2>&1 | sed 's/^/   /' || echo "   Cannot read build output"
  echo ""
  echo "=== End of Diagnostics ==="
  echo ""
  # #region agent log
  echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:72\",\"message\":\"Standalone directory missing\",\"data\":{\"error\":\"standalone_not_found\",\"build_exit\":$BUILD_EXIT},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"A\"}" >> "$LOG_FILE"
  # #endregion
  
  # 如果构建失败，使用构建的退出代码；否则使用 1
  if [ $BUILD_EXIT -ne 0 ]; then
    exit $BUILD_EXIT
  else
    exit 1
  fi
fi

echo "=== Build verification passed ==="
echo "Standalone directory contents (first 10 items):"
ls -la .next/standalone/ 2>&1 | head -10 || echo "Cannot list standalone directory"
echo ""
echo "Checking for server.js in standalone:"
test -f .next/standalone/server.js && echo "✓ server.js found" || echo "✗ server.js NOT found"

# #region agent log
echo "{\"timestamp\":$(date +%s000),\"location\":\"build-with-debug.sh:77\",\"message\":\"Build verification passed\",\"data\":{\"standalone_exists\":\"$STANDALONE_EXISTS\",\"static_exists\":\"$STATIC_EXISTS\"},\"sessionId\":\"debug-session\",\"runId\":\"build\",\"hypothesisId\":\"ALL\"}" >> "$LOG_FILE"
# #endregion

# 确保脚本成功退出
exit 0

