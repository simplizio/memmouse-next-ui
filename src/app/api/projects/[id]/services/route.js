export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { makeToken } from "@/server/repos/makeToken.js";

export async function GET(_req, { params }) {
    const { id } = await params;
    const items = await ServiceRepo.list(id);
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id } = await params; // projectId
    const body = await req.json(); // { id, name, scopes? }
    const svc = {
        projectId: id,
        id: body.id,
        name: body.name || body.id,
        scopes: body.scopes || [],
        tokens: [{ id: "t1", value: makeToken(), createdAt: Date.now(), status: "active" }],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    await ServiceRepo.create(svc);
    return NextResponse.json(svc, { status: 201 });
}
