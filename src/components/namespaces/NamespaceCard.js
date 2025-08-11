"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const bytes = (n)=>{ if(n==null) return "—"; const u=["B","KB","MB","GB","TB"]; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(v<10?1:0)} ${u[i]}`; };
const pct = (u,q)=>Math.max(0, Math.min(100, Math.round((u/Math.max(q||1,1))*100)));

export default function NamespaceCard({ ns, onOpen, onToggleFreeze }) {
    const [busy,setBusy] = useState(false);
    const p = pct(ns.usedBytes, ns.quotaBytes);
    const danger = p >= 90;

    async function toggle() {
        setBusy(true);
        try { await onToggleFreeze?.(ns); } finally { setBusy(false); }
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-semibold">{ns.prefix}</div>
                    <div className="mt-1 inline-flex items-center gap-2 text-xs text-zinc-300">
            <span className={`rounded-full px-2 py-0.5 border ${ns.status==='frozen'
                ? "bg-red-400/15 border-red-300/30 text-red-200"
                : "bg-white/5 border-white/15"}`}>
              {ns.status}
            </span>
                        <span className="opacity-70">{ns.ttl === "none" ? "TTL: —" : `TTL: ${ns.ttl}`}, {ns.eviction}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={()=>onOpen?.(ns)} className="px-3 py-1.5">Open</Button>
                    <Button variant="ghost" onClick={toggle} disabled={busy} className="px-3 py-1.5">
                        {ns.status === "frozen" ? "Unfreeze" : "Freeze"}
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                        <div className={`h-full ${danger?"bg-red-400/60":"bg-white/60"}`} style={{ width: `${p}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span>Used {bytes(ns.usedBytes)} / {bytes(ns.quotaBytes)}</span>
                        <span>{p}%</span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <Metric label="Keys" value={ns.keys} />
                        <Metric label="RPS" value={ns.ops?.rps ?? 0} />
                        <Metric label="WPS" value={ns.ops?.wps ?? 0} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Metric({ label, value }) {
    return (
        <div className="mm-glass rounded-xl px-3 py-2 text-center">
            <div className="font-semibold">{value}</div>
            <div className="text-xs text-zinc-300">{label}</div>
        </div>
    );
}
