// ============================================
// 文件: app/api/admin/auth/route.ts
// 管理员认证并预加载数据的 API
// ============================================
import { NextRequest, NextResponse } from 'next/server';

const WORKER_API = process.env.WORKER_API_URL || 'https://zai-2api-serverless.rand0mk4cas.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const { admin_key } = await request.json();
    
    if (!admin_key || !admin_key.startsWith('admin-sk-')) {
      return NextResponse.json(
        { error: '无效的管理员密钥' },
        { status: 401 }
      );
    }

    // 并行获取所有数据
    const [usersRes, accountsRes, statsRes, logsRes, configRes] = await Promise.all([
      fetch(`${WORKER_API}/admin/users/list`, {
        headers: { 'Authorization': `Bearer ${admin_key}` }
      }),
      fetch(`${WORKER_API}/admin/accounts/list`, {
        headers: { 'Authorization': `Bearer ${admin_key}` }
      }),
      fetch(`${WORKER_API}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${admin_key}` }
      }),
      fetch(`${WORKER_API}/admin/logs`, {
        headers: { 'Authorization': `Bearer ${admin_key}` }
      }),
      fetch(`${WORKER_API}/admin/config`, {
        headers: { 'Authorization': `Bearer ${admin_key}` }
      })
    ]);

    // 检查认证是否成功
    if (!usersRes.ok) {
      return NextResponse.json(
        { error: '认证失败' },
        { status: 401 }
      );
    }

    // 解析所有响应
    const [users, accounts, stats, logs, config] = await Promise.all([
      usersRes.json(),
      accountsRes.json(),
      statsRes.json(),
      logsRes.json(),
      configRes.json()
    ]);

    // 脱敏处理
    const sanitizedUsers = users.users?.map((user: any) => ({
      ...user,
      api_key: maskApiKey(user.api_key)
    })) || [];

    const sanitizedAccounts = accounts.accounts?.map((account: any) => ({
      id: account.id,
      name: account.name,
      token_source: account.token_source,
      created_at: account.created_at,
      expires_at: account.expires_at,
      is_active: account.is_active,
      total_calls: account.total_calls,
      last_used_at: account.last_used_at,
      discord_username: account.discord_username,
      discord_token_status: getTokenStatus(account),
      last_refresh_at: account.last_refresh_at,
      expires_in_hours: getExpiresInHours(account.expires_at)
      // 不返回实际的 token 和 discord_token
    })) || [];

    // 计算即将过期的账号数量
    const expiringSoon = sanitizedAccounts.filter(
      (acc: any) => acc.expires_in_hours && acc.expires_in_hours < 48
    ).length;

    return NextResponse.json({
      users: sanitizedUsers,
      accounts: sanitizedAccounts,
      stats: {
        ...stats,
        accounts: {
          ...stats.accounts,
          expiring_soon: expiringSoon
        }
      },
      recent_logs: logs.logs?.slice(0, 50) || [],
      config: config
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 脱敏 API Key - 只显示前后几位
function maskApiKey(key: string): string {
  if (!key || key.length < 16) return key;
  const prefix = key.slice(0, 10);
  const suffix = key.slice(-6);
  return `${prefix}...${suffix}`;
}

// 判断 Token 状态
function getTokenStatus(account: any): 'valid' | 'expired' | 'missing' {
  if (!account.token && !account.discord_token) return 'missing';
  
  if (account.expires_at) {
    const expiresAt = new Date(account.expires_at);
    const now = new Date();
    if (expiresAt < now) return 'expired';
  }
  
  return 'valid';
}

// 计算距离过期的小时数
function getExpiresInHours(expiresAt: string | null): number | undefined {
  if (!expiresAt) return undefined;
  
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  return diffHours > 0 ? diffHours : 0;
}



// ============================================
// 文件: .env (示例配置)
// ============================================
/*
WORKER_API_URL=https://zai-2api-serverless.rand0mk4cas.workers.dev
*/
