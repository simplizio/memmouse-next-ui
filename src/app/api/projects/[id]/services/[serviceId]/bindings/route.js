export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

export async function GET(_req, { params }) {
    const { id, serviceId } = await params;
    const nsIds = await BindingRepo.listNamespacesForService(id, serviceId);
    return NextResponse.json({ nsIds });
}
