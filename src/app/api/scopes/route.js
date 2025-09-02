export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { ScopeRepo } from "@/server/repos/ScopeRepo.js";

export async function GET() {
    const items = await ScopeRepo.list();
    return NextResponse.json({ items });
}
