"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function bytes(n){ if(n==null)return "—"; const u=["B","KB","MB","GB","TB"]; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(v<10?1:0)} ${u[i]}`; }
function pct(used, quota){ return Math.max(0, Math.min(100, Math.round((used/Math.max(quota||1,1))*100))); }
function timeAgo(ts){ const s=Math.max(1,Math.floor((Date.now()-ts)/1e3)); if(s<60)return `${s}s ago`; const m=Math.floor(s/60); if(m<60)return `${m}m ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; const d=Math.floor(h/24); return `${d}d ago`; }

export default function ProjectCard({ project, onOpen }) {
    const router = useRouter();
    const { id, name, department, usedBytes, quotaBytes, ops, alerts, updatedAt } = project;
    const p = pct(usedBytes, quotaBytes);
    const danger = p >= 90;

    const openProject = () => {
        // call custom hook if needed and go to route anyway
        try { onOpen?.(project); } catch {}
        router.push(`/projects/${id}`);
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-semibold">{name}</div>
                    <div className="mt-1 inline-flex items-center gap-2 text-xs text-zinc-300">
                        <span className="rounded-full border border-white/15 px-2 py-0.5 bg-white/5">{department || "—"}</span>
                        <span className="opacity-70">{timeAgo(updatedAt)}</span>
                    </div>
                </div>
                <Button onClick={openProject} className="px-3 py-1.5">Open</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                        <div className={`h-full ${danger ? "bg-red-400/60" : "bg-white/60"}`} style={{ width: `${p}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span>Used {bytes(usedBytes)} / {bytes(quotaBytes)}</span>
                        <span>{p}%</span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <Meta label="rps" value={ops?.rps ?? 0} />
                        <Meta label="wps" value={ops?.wps ?? 0} />
                        <Meta label="alerts" value={alerts ?? 0} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Meta({ label, value }){
    return (
        <div className="mm-glass rounded-xl px-3 py-2 text-center">
            <div className="font-semibold">{value}</div>
            <div className="text-xs text-zinc-300">{label}</div>
        </div>
    );
}
