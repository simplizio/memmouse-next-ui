export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const nsId = searchParams.get("nsId"); // пока не используем, просто заглушка
    // вернём пустой список (или можно нагенерить фейковые события тут)
    return NextResponse.json({ projectId: id, nsId, items: [] });
}
