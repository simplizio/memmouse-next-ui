export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureSeeded } from "@/server/services/bootstrap.js";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "1";
    const drop = searchParams.get("drop") === "1";
    const res = await ensureSeeded({ force, drop });
    return NextResponse.json(res);
}

export async function POST(req) {
    const { force = false, drop = false } = await req.json().catch(() => ({}));
    const res = await ensureSeeded({ force, drop });
    return NextResponse.json(res);
}



// import { NextResponse } from "next/server";
// import { ensureSeeded } from "@/server/services/bootstrap.js";
//
// export const runtime = "nodejs";
//
// export async function GET() {
//     const res = await ensureSeeded();
//     return NextResponse.json(res);
// }
//
// export async function POST() {
//     const res = await ensureSeeded();
//     return NextResponse.json(res);
// }
