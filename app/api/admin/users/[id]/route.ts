// ============================================
// 文件: app/api/admin/users/[id]/route.ts
// 删除用户 API
// ============================================
import {NextRequest, NextResponse} from "next/server";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // 修改参数类型
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: '未授权' }, { status: 401 });
        }

        const admin_key = authHeader.replace('Bearer ', '');
        const resolvedParams = await params; // 添加这行解析 Promise
        const userId = resolvedParams.id; // 从解析后的对象获取 id

        const response = await fetch(`${process.env.WORKER_API}/admin/users/delete/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${admin_key}` }
        });

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }
}
