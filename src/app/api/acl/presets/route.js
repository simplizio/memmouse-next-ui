export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";

// GET /api/acl/presets
export async function GET() {
    const defaults = await AclPresetRepo.ensureDefaults();
    const items = await AclPresetRepo.list();
    return NextResponse.json({ items });
}

// POST /api/acl/presets  {name, commands[], description?}
export async function POST(req) {
    const body = await req.json().catch(()=> ({}));
    if (!body.name || !Array.isArray(body.commands)) {
        return NextResponse.json({ error: "name and commands[] required" }, { status: 400 });
    }
    const rec = await AclPresetRepo.upsert({
        name: String(body.name),
        commands: body.commands.map(String),
        description: String(body.description || ""),
        builtin: false,
    });
    return NextResponse.json(rec, { status: 201 });
}


// export const runtime = "nodejs";
// import { NextResponse } from "next/server";
// import { ACL_PRESETS } from "@/server/services/AclPresets.js";
//
// export async function GET() {
//     // return as { name, commands[] } array
//     const items = Object.entries(ACL_PRESETS).map(([name, commands]) => ({ name, commands }));
//     return NextResponse.json({ items });
// }
