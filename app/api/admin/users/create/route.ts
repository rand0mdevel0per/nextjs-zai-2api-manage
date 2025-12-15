// ============================================
// 文件: app/api/admin/users/create/route.ts
// 创建用户 API
// ============================================
import {NextRequest, NextResponse} from "next/server";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: '未授权' }, { status: 401 });
        }

        const admin_key = authHeader.replace('Bearer ', '');
        const body = await request.json();

        const response = await fetch(`${process.env.WORKER_API}/admin/users/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${admin_key}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }
}
