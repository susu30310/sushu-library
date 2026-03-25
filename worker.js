/**
 * 苏苏书房 - GitHub Release 上传代理 Worker
 * 
 * 作用：浏览器无法直接跨域访问 uploads.github.com，
 *       此 Worker 作为中转代理，将上传请求转发给 GitHub，并添加正确的 CORS 头。
 * 
 * 部署步骤：
 *   1. 打开 https://workers.cloudflare.com/
 *   2. 注册 / 登录 Cloudflare 账号（完全免费）
 *   3. 点击「Create a Worker」
 *   4. 将此文件内容粘贴到编辑器，点击「Save and Deploy」
 *   5. 复制 Worker 的 URL（形如 https://xxx.workers.dev），
 *      填入苏苏书房「同步」面板的「上传代理地址」输入框
 */

const ALLOWED_ORIGINS = ['https://susu30310.github.io'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 从查询参数读取目标 URL（uploads.github.com）
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('target');
    if (!targetUrl || !targetUrl.startsWith('https://uploads.github.com/')) {
      return new Response('Bad Request: invalid target', { status: 400 });
    }

    // 转发请求
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Accept': request.headers.get('Accept') || 'application/vnd.github+json',
        'Content-Type': request.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': request.headers.get('Content-Length') || '',
      },
      body: request.body,
      // Cloudflare Worker 默认不限制流式传输大小
    });

    const responseBody = await upstream.arrayBuffer();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        ...Object.fromEntries(upstream.headers.entries()),
        ...corsHeaders(origin),
      },
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Content-Length',
    'Access-Control-Max-Age': '86400',
  };
}
