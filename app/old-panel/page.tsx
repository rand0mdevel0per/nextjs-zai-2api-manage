'use client';

import { useState, useEffect } from 'react';

const WORKER_API = 'https://zai-2api-serverless.rand0mk4cas.workers.dev';

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
}

interface Stats {
    users: { total: number; active: number };
    accounts: { total: number; active: number };
    requests_24h: { total: number; success: number; error: number };
}

export default function AdminDashboard() {
    const [adminKey, setAdminKey] = useState('');
    const [isAuthed, setIsAuthed] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'accounts' | 'stats'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showBrowserLogin, setShowBrowserLogin] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', rate_limit: 100 });
    const [newAccount, setNewAccount] = useState({ name: '', token: '' });
    const [browserLoginName, setBrowserLoginName] = useState('');

    const handleAuth = () => {
        if (adminKey && adminKey.startsWith('admin-sk-')) {
            localStorage.setItem('admin_key', adminKey);
            setIsAuthed(true);
            fetchData();
        } else {
            alert('请输入有效的管理员密钥（以 admin-sk- 开头）');
        }
    };

    useEffect(() => {
        const savedKey = localStorage.getItem('admin_key');
        if (savedKey) {
            setAdminKey(savedKey);
            setIsAuthed(true);
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        const key = localStorage.getItem('admin_key');
        if (!key) return;

        try {
            const usersRes = await fetch(`${WORKER_API}/admin/users/list`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);

            const accountsRes = await fetch(`${WORKER_API}/admin/accounts/list`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            const accountsData = await accountsRes.json();
            setAccounts(accountsData.accounts || []);

            const statsRes = await fetch(`${WORKER_API}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            const statsData = await statsRes.json();
            setStats(statsData);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.name) {
            alert('请输入用户名称');
            return;
        }

        try {
            const res = await fetch(`${WORKER_API}/admin/users/create`, {
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

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.token) {
            alert('请填写账号名称和 Token');
            return;
        }

        try {
            const res = await fetch(`${WORKER_API}/admin/accounts/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_key')}`
                },
                body: JSON.stringify(newAccount)
            });

            const data = await res.json();

            if (data.success) {
                alert('账号添加成功！');
                setShowAddAccount(false);
                setNewAccount({ name: '', token: '' });
                fetchData();
            } else {
                alert(`添加失败: ${data.message}`);
            }
        } catch (error) {
            alert('添加失败，请检查网络连接');
        }
    };

    const handleBrowserLogin = async () => {
        if (!browserLoginName) {
            alert('请输入账号名称');
            return;
        }

        try {
            const res = await fetch(`${WORKER_API}/admin/accounts/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_key')}`
                },
                body: JSON.stringify({ name: browserLoginName })
            });

            const data = await res.json();

            if (data.success) {
                alert(`登录成功！\n账号: ${data.name}\nDiscord: ${data.discord_username || '未获取'}`);
                setShowBrowserLogin(false);
                setBrowserLoginName('');
                fetchData();
            } else {
                alert(`登录失败: ${data.message}`);
            }
        } catch (error) {
            alert('登录失败，请检查网络连接');
        }
    };

    const handleRefreshToken = async (accountId: number) => {
        if (!confirm('确定要刷新此账号的 Token 吗？')) return;

        try {
            const res = await fetch(`${WORKER_API}/admin/accounts/refresh`, {
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
            await fetch(`${WORKER_API}/admin/users/delete/${userId}`, {
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
            await fetch(`${WORKER_API}/admin/accounts/delete/${accountId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_key')}` }
            });
            fetchData();
        } catch (error) {
            alert('删除失败');
        }
    };

    if (!isAuthed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
                <div className="bg-white p-10 rounded-xl shadow-lg border border-slate-200 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
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
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm font-medium"
                        >
                            登录
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
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Zai-2API</h1>
                                <p className="text-xs text-slate-500">管理控制台</p>
                            </div>
                        </div>
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

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">用户</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.users.active}</div>
                            <div className="text-sm text-slate-500">共 {stats.users.total} 个用户</div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">账号</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.accounts.active}</div>
                            <div className="text-sm text-slate-500">共 {stats.accounts.total} 个账号</div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">24H 请求</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.requests_24h.total}</div>
                            <div className="text-sm text-slate-500">成功 {stats.requests_24h.success} / 失败 {stats.requests_24h.error}</div>
                        </div>
                    </div>
                )}

                {/* Main Content Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-slate-200 bg-slate-50">
                        <div className="flex px-6">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-4 py-4 text-sm font-medium transition-all relative ${
                                    activeTab === 'users'
                                        ? 'text-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>用户管理</span>
                </span>
                                {activeTab === 'users' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('accounts')}
                                className={`px-4 py-4 text-sm font-medium transition-all relative ${
                                    activeTab === 'accounts'
                                        ? 'text-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>账号管理</span>
                </span>
                                {activeTab === 'accounts' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-slate-900">用户列表</h2>
                                <button
                                    onClick={() => setShowCreateUser(true)}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>创建用户</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名称</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">API Key</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">速率限制</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">总请求</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
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
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                    title="删除用户"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-slate-900">Zai 账号列表</h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowBrowserLogin(true)}
                                        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                        <span>浏览器登录</span>
                                    </button>
                                    <button
                                        onClick={() => setShowAddAccount(true)}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>手动添加</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名称</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">来源</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Discord</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">过期时间</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">调用次数</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                    {accounts.map((account) => (
                                        <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                {account.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
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
                              浏览器
                            </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              手动
                            </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{account.discord_username || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {account.expires_at ? new Date(account.expires_at).toLocaleString('zh-CN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{account.total_calls}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {account.token_source === 'browser' && (
                                                        <button
                                                            onClick={() => handleRefreshToken(account.id)}
                                                            className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                                                            title="刷新 Token"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteAccount(account.id, account.name)}
                                                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                        title="删除账号"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
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
                </div>
            </div>

            {/* Modals */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">创建用户</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">用户名称</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="客户A"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">速率限制（请求/小时）</label>
                                <input
                                    type="number"
                                    value={newUser.rate_limit}
                                    onChange={(e) => setNewUser({ ...newUser, rate_limit: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateUser(false)}
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddAccount && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">手动添加账号</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">账号名称</label>
                                <input
                                    type="text"
                                    value={newAccount.name}
                                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="我的账号"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Zai Token</label>
                                <textarea
                                    value={newAccount.token}
                                    onChange={(e) => setNewAccount({ ...newAccount, token: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    rows={4}
                                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddAccount(false)}
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAddAccount}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                添加
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBrowserLogin && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">浏览器登录</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-800">
                                            点击开始后，系统会自动打开浏览器窗口。在浏览器中完成 Discord 登录后，Token 会自动保存。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">账号名称</label>
                                <input
                                    type="text"
                                    value={browserLoginName}
                                    onChange={(e) => setBrowserLoginName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="我的账号"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={() => setShowBrowserLogin(false)}
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleBrowserLogin}
                                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                开始登录
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}