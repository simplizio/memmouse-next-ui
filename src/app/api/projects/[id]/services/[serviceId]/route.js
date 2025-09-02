export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

export async function GET(_req, { params }) {
    const { id, serviceId } = await params;
    const svc = await ServiceRepo.get(id, serviceId);
    return svc ? NextResponse.json(svc) : NextResponse.json({ error:"not found" }, { status:404 });
}

export async function PATCH(req, { params }) {
    const { id, serviceId } = await params;
    const data = await req.json();
    const svc = await ServiceRepo.patch(id, serviceId, data);
    return svc ? NextResponse.json(svc) : NextResponse.json({ error:"not found" }, { status:404 });
}


export async function DELETE(_req, { params }) {
    const { id: projectId, serviceId } = await params;
    try {
        // снять все биндинги сервиса
        const nsIds = await BindingRepo.listByService(projectId, serviceId).catch(() => []);
        for (const nsId of nsIds) {
            await BindingRepo.remove(projectId, nsId, serviceId);
        }
        // удалить сам сервис
        await ServiceRepo.remove(projectId, serviceId);

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
}

// export async function DELETE(_req, { params }) {
//     const { id, serviceId } = await params;
//     await ServiceRepo.remove(id, serviceId);
//     return NextResponse.json({ ok:true });
// }
