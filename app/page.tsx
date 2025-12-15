// ============================================
// 文件: app/admin/page.tsx
// 主管理面板页面（Client Component）
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { Users, Key, Activity, Settings, RefreshCw, Trash2, Plus, Globe, BarChart3, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface User {
  id: number;
  name: string;
  api_key: string;
  rate_limit: number;
  created_at: string;
  is_active: number;
  total_requests: number;
  last_used_at: string;
}

interface Account {
  id: number;
  name: string;
  token_source: string;
  created_at: string;
  expires_at: string;
  is_active: number;
  total_calls: number;
  last_used_at: string;
  discord_username: string;
  discord_token_status: 'valid' | 'expired' | 'missing';
  last_refresh_at: string;
  expires_in_hours?: number;
}

interface Stats {
  users: { total: number; active: number };
  accounts: { total: number; active: number; expiring_soon: number };
  requests_24h: { total: number; success: number; error: number };
  requests_trend: { hour: string; count: number }[];
}

interface LogEntry {
  id: number;
  timestamp: string;
  user_id: number;
  account_name: string;
  model: string;
  status: string;
  duration: number;
  error_message?: string;
}

interface SystemConfig {
  version: string;
  auto_refresh_enabled: boolean;
  auto_refresh_interval: number;
  max_concurrent_requests: number;
  discord_login_enabled: boolean;
}

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'accounts' | 'logs' | 'config'>('overview');
  
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showBrowserLogin, setShowBrowserLogin] = useState(false);
  
  const [newUser, setNewUser] = useState({ name: '', rate_limit: 100 });
  const [newAccount, setNewAccount] = useState({ name: '', token: '', discord_token: '' });
  const [browserLoginName, setBrowserLoginName] = useState('');

  // 鉴权并预加载数据
  const handleAuth = async () => {
    if (!adminKey || !adminKey.startsWith('admin-sk-')) {
      alert('请输入有效的管理员密钥（以 admin-sk- 开头）');
      return;
    }

    setLoading(true);
    try {
      // 验证密钥并预加载所有数据
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_key: adminKey })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_key', adminKey);
        setIsAuthed(true);
        
        // 预加载的数据
        setUsers(data.users || []);
        setAccounts(data.accounts || []);
        setStats(data.stats || null);
        setLogs(data.recent_logs || []);
        setConfig(data.config || null);
      } else {
        alert('认证失败，请检查管理员密钥');
      }
    } catch (error) {
      alert('连接失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key');
    if (savedKey) {
      setAdminKey(savedKey);
      handleAuth();
    }
  }, []);

  const fetchData = async () => {
    const key = localStorage.getItem('admin_key');
    if (!key) return;

    try {
      const response = await fetch('/api/admin/data', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setAccounts(data.accounts || []);
        setStats(data.stats || null);
        setLogs(data.recent_logs || []);
        setConfig(data.config || null);
      }
    } catch (error) {
      console.error('数据加载失败:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name) {
      alert('请输入用户名称');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_key')}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await res.json();

      if (data.success) {
        alert(`用户创建成功！\n\nAPI Key: ${data.api_key}\n\n请复制保存，此密钥不会再次显示。`);
        setShowCreateUser(false);
        setNewUser({ name: '', rate_limit: 100 });
        fetchData();
      } else {
        alert(`创建失败: ${data.message}`);
      }
    } catch (error) {
      alert('创建失败，请检查网络连接');
    }
  };

  const handleRefreshToken = async (accountId: number) => {
    if (!confirm('确定要刷新此账号的 Token 吗？')) return;

    try {
      const res = await fetch('/api/admin/accounts/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_key')}`
        },
        body: JSON.stringify({ account_id: accountId })
      });

      const data = await res.json();

      if (data.success) {
        alert('Token 刷新成功！');
        fetchData();
      } else {
        alert(`刷新失败: ${data.message}`);
      }
    } catch (error) {
      alert('刷新失败');
    }
  };

  const handleDeleteUser = async (userId: number, name: string) => {
    if (!confirm(`确定删除用户 "${name}" 吗？`)) return;

    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_key')}` }
      });
      fetchData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleDeleteAccount = async (accountId: number, name: string) => {
    if (!confirm(`确定删除账号 "${name}" 吗？`)) return;

    try {
      await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_key')}` }
      });
      fetchData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_key')}`
        },
        body: JSON.stringify({ key, value })
      });
      fetchData();
    } catch (error) {
      alert('更新配置失败');
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="bg-white p-10 rounded-xl shadow-lg border border-slate-200 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 shadow-lg">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Zai-2API</h1>
            <p className="text-sm text-slate-500">管理控制台</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                管理员密钥
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="admin-sk-..."
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm font-medium disabled:opacity-50"
            >
              {loading ? '验证中...' : '登录'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Zai-2API</h1>
                <p className="text-xs text-slate-500">管理控制台 v{config?.version || '2.0.0'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                title="刷新数据"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_key');
                  setIsAuthed(false);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex px-6 border-b border-slate-200 bg-slate-50">
            {[
              { id: 'overview', label: '概览', icon: BarChart3 },
              { id: 'users', label: '用户管理', icon: Users },
              { id: 'accounts', label: '账号管理', icon: Key },
              { id: 'logs', label: '调用日志', icon: Activity },
              { id: 'config', label: '系统配置', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 text-sm font-medium transition-all relative flex items-center space-x-2 ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.users.active}</div>
                <div className="text-sm text-slate-500">活跃用户 / 共 {stats.users.total} 个</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.accounts.active}</div>
                <div className="text-sm text-slate-500">可用账号 / 共 {stats.accounts.total} 个</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.requests_24h.total}</div>
                <div className="text-sm text-slate-500">24小时请求数</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.accounts.expiring_soon || 0}</div>
                <div className="text-sm text-slate-500">即将过期账号</div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">请求成功率</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">成功</span>
                    <span className="font-medium text-emerald-600">{stats.requests_24h.success}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.requests_24h.success / stats.requests_24h.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">失败</span>
                    <span className="font-medium text-red-600">{stats.requests_24h.error}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.requests_24h.error / stats.requests_24h.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Health Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">账号健康状态</h3>
              <div className="space-y-3">
                {accounts.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        account.discord_token_status === 'valid' ? 'bg-emerald-500' :
                        account.discord_token_status === 'expired' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}></div>
                      <div>
                        <div className="font-medium text-slate-900">{account.name}</div>
                        <div className="text-xs text-slate-500">{account.discord_username || '未关联'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">{account.total_calls} 次调用</div>
                      {account.expires_in_hours && (
                        <div className="text-xs text-slate-500">
                          {account.expires_in_hours < 24 ? 
                            `${account.expires_in_hours}小时后过期` : 
                            `${Math.floor(account.expires_in_hours / 24)}天后过期`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">用户列表</h2>
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>创建用户</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">API Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">速率限制</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">总请求</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">最后使用</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900">{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                          {user.api_key}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.rate_limit}/小时</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.total_requests}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.last_used_at ? new Date(user.last_used_at).toLocaleString('zh-CN') : '未使用'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Zai 账号列表</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBrowserLogin(true)}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
                >
                  <Globe className="w-4 h-4" />
                  <span>浏览器登录</span>
                </button>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>手动添加</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">来源</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Discord</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Token状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">过期时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">调用次数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        {account.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            启用
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            禁用
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{account.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {account.token_source === 'browser' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Globe className="w-3 h-3 mr-1" />
                            浏览器
                          </span>
                        ) : account.token_source === 'discord' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Discord
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            手动
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{account.discord_username || '-'}</td>
                      <td className="px-6 py-4">
                        {account.discord_token_status === 'valid' ? (
                          <span className="inline-flex items-center text-xs text-emerald-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            有效
                          </span>
                        ) : account.discord_token_status === 'expired' ? (
                          <span className="inline-flex items-center text-xs text-amber-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            已过期
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {account.expires_at ? (
                          <div>
                            <div>{new Date(account.expires_at).toLocaleString('zh-CN')}</div>
                            {account.expires_in_hours && account.expires_in_hours < 24 && (
                              <div className="text-xs text-amber-600 mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                即将过期
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{account.total_calls}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {(account.token_source === 'browser' || account.token_source === 'discord') && (
                            <button
                              onClick={() => handleRefreshToken(account.id)}
                              className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                              title="刷新 Token"
                            >
                              <RefreshCw className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAccount(account.id, account.name)}
                            className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">调用日志</h2>
              <button
                onClick={fetchData}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">账号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">模型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">耗时</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">错误信息</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.user_id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.account_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.model}</td>
                      <td className="px-6 py-4">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            成功
                          </span>
                        ) : log.status === 'ERROR' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            错误
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            超时
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.duration}ms</td>
                      <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-xs">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && config && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">系统配置</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">自动刷新 Token</div>
                  <div className="text-sm text-slate-500">定期自动刷新即将过期的账号 Token</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.auto_refresh_enabled}
                    onChange={(e) => updateConfig('auto_refresh_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">Discord 登录</div>
                  <div className="text-sm text-slate-500">允许通过 Discord 自动登录获取 Token</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.discord_login_enabled}
                    onChange={(e) => updateConfig('discord_login_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-slate-900">刷新间隔（秒）</div>
                  <input
                    type="number"
                    value={config.auto_refresh_interval}
                    onChange={(e) => updateConfig('auto_refresh_interval', parseInt(e.target.value))}
                    className="w-24 px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="text-sm text-slate-500">自动刷新检查的时间间隔</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-slate-900">最大并发请求</div>
                  <input
                    type="number"
                    value={config.max_concurrent_requests}
                    onChange={(e) => updateConfig('max_concurrent_requests', parseInt(e.target.value))}
                    className="w-24 px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="text-sm text-slate-500">系统允许的最大并发请求数</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals remain the same as before... */}
    </div>
  );
}
