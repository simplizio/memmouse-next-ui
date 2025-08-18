export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";

export async function POST(req, { params }) {
    const { id: projectId, serviceId } = await params;
    const body = await req.json().catch(() => ({}));
    try {
        const { rotatedFrom, rotatedTo } = await ServiceRepo.rotateToken(projectId, serviceId, {
            fromTokenId: body.fromTokenId || null,
            revokeOld: body.revokeOld !== false, // по умолчанию ревокаем старый
        });
        // новый токен со значением вернём, чтобы скопировать
        return NextResponse.json({ rotatedFrom, rotatedTo }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
