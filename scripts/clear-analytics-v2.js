const fs = require('fs');
const path = require('path');
const http = require('http');

const dbPath = path.join(process.cwd(), 'content/analytics-v2.db');

// 方法1: 尝试通过API清空（推荐）
async function clearViaAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/analytics-v2/clear',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': 'true'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ V2统计数据库已通过API清空');
          resolve(true);
        } else {
          console.log('⚠️  API清空失败，尝试直接删除文件...');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('⚠️  API请求失败（服务器可能未运行），尝试直接删除文件...');
      resolve(false);
    });

    req.end();
  });
}

// 方法2: 直接删除文件（带重试机制）
async function clearDirectly() {
  if (!fs.existsSync(dbPath)) {
    console.log('ℹ️  数据库文件不存在，无需删除');
    return true;
  }

  let retries = 10;
  while (retries > 0) {
    try {
      // 尝试删除文件
      fs.unlinkSync(dbPath);
      console.log('✅ V2统计数据库已删除:', dbPath);
      return true;
    } catch (error) {
      if (error.code === 'EBUSY' && retries > 1) {
        // 文件被锁定，等待后重试
        retries--;
        console.log(`⏳ 文件被锁定，等待后重试... (剩余 ${retries} 次)`);
        // 异步等待
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      console.error('❌ 删除数据库失败:', error.message);
      console.error('💡 提示: 请确保：');
      console.error('   1. 开发服务器已停止');
      console.error('   2. 没有其他程序正在使用数据库文件');
      console.error('   3. 或者使用 API 方式清空: curl -X POST http://localhost:3000/api/analytics-v2/clear -H "x-admin-auth: true"');
      return false;
    }
  }
  return false;
}

// 主函数
async function main() {
  console.log('🔄 正在清空V2统计数据...\n');
  
  // 先尝试通过API清空
  const apiSuccess = await clearViaAPI();
  
  if (!apiSuccess) {
    // API失败，尝试直接删除
    console.log('\n📁 尝试直接删除数据库文件...');
    await clearDirectly();
  }
}

main();

