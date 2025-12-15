// ============================================
// 文件: app/api/admin/data/route.ts
// 刷新数据的 API
// ============================================
import {NextRequest, NextResponse} from "next/server";
import {POST} from "@/app/api/admin/auth/route";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: '未授权' }, { status: 401 });
        }

        const admin_key = authHeader.replace('Bearer ', '');

        // 复用 POST 的逻辑
        return await POST(
            new NextRequest(request.url, {
                method: 'POST',
                body: JSON.stringify({admin_key})
            })
        );
    } catch (error) {
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }
}
