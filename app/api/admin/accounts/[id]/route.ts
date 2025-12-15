// ============================================
// 文件: app/api/admin/accounts/[id]/route.ts
// 删除账号 API
// ============================================
import {NextRequest, NextResponse} from "next/server";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // 修改这里
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: '未授权' }, { status: 401 });
        }

        const admin_key = authHeader.replace('Bearer ', '');
        const resolvedParams = await params; // 添加这行
        const accountId = resolvedParams.id; // 修改这里

        const response = await fetch(`${process.env.WORKER_API}/admin/accounts/delete/${accountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${admin_key}` }
        });

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }
}
