export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const nsId = searchParams.get("nsId"); // it's just a stub for now

    // return events here, empty list of mock events to the moment
    return NextResponse.json({ projectId: id, nsId, items: [] });
}
