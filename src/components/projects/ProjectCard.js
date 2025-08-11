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

// "use client";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
//
// function bytes(n){
//     if (n == null) return "—"; const u=["B","KB","MB","GB","TB"]; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(v<10?1:0)} ${u[i]}`;
// }
// function pct(used, quota){ return Math.max(0, Math.min(100, Math.round((used/Math.max(quota||1,1))*100))); }
// function timeAgo(ts){ const s=Math.max(1,Math.floor((Date.now()-ts)/1e3)); if(s<60)return `${s}s ago`; const m=Math.floor(s/60); if(m<60)return `${m}m ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; const d=Math.floor(h/24); return `${d}d ago`; }
//
// export default function ProjectCard({ project, onOpen }) {
//     const { name, department, usedBytes, quotaBytes, ops, alerts, updatedAt } = project;
//     const p = pct(usedBytes, quotaBytes);
//     const danger = p >= 90;
//
//     return (
//         <Card className="rounded-2xl">
//             <CardHeader className="flex items-start justify-between gap-2">
//                 <div>
//                     <div className="font-semibold">{name}</div>
//                     <div className="mt-1 inline-flex items-center gap-2 text-xs text-zinc-300">
//                         <span className="rounded-full border border-white/15 px-2 py-0.5 bg-white/5">{department || "—"}</span>
//                         <span className="opacity-70">{timeAgo(updatedAt)}</span>
//                     </div>
//                 </div>
//                 <Button onClick={onOpen} className="px-3 py-1.5">Open</Button>
//             </CardHeader>
//             <CardContent>
//                 <div className="space-y-2">
//                     <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
//                         <div
//                             className={`h-full ${danger ? "bg-red-400/60" : "bg-white/60"}`}
//                             style={{ width: `${p}%` }}
//                         />
//                     </div>
//                     <div className="flex items-center justify-between text-xs text-zinc-300">
//                         <span>Used {bytes(usedBytes)} / {bytes(quotaBytes)}</span>
//                         <span>{p}%</span>
//                     </div>
//
//                     <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
//                         <Meta label="rps" value={ops?.rps ?? 0} />
//                         <Meta label="wps" value={ops?.wps ?? 0} />
//                         <Meta label="alerts" value={alerts ?? 0} />
//                     </div>
//                 </div>
//             </CardContent>
//         </Card>
//     );
// }
//
// function Meta({ label, value }){
//     return (
//         <div className="mm-glass rounded-xl px-3 py-2 text-center">
//             <div className="font-semibold">{value}</div>
//             <div className="text-xs text-zinc-300">{label}</div>
//         </div>
//     );
// }

// "use client";
// import { bytes, clamp, fmtPercent } from "@/lib/formatters";
//
// export default function ProjectCard({ project, onOpen }) {
//     const { name, department, usedBytes, quotaBytes, ops, alerts, updatedAt } = project;
//     const pct = clamp((usedBytes / Math.max(quotaBytes, 1)) * 100);
//     const danger = pct >= 90;
//
//     return (
//         <div style={styles.card}>
//             <div style={styles.topRow}>
//                 <div>
//                     <div style={styles.title}>{name}</div>
//                     <div style={styles.badge}>{department || "—"}</div>
//                 </div>
//                 <button style={styles.openBtn} onClick={onOpen}>Open</button>
//             </div>
//
//             <div style={{margin: "10px 0 8px"}}>
//                 <div style={styles.progressBar}>
//                     <div style={{...styles.progressFill, width: `${pct}%`, background: danger ? "#e74c3c" : "#3a86ff"}} />
//                 </div>
//                 <div style={styles.kv}>
//                     <span>Used {bytes(usedBytes)} / {bytes(quotaBytes)}</span>
//                     <span>{fmtPercent(pct)}</span>
//                 </div>
//             </div>
//
//             <div style={styles.metaRow}>
//                 <div style={styles.metaItem}><strong>{ops?.rps ?? 0}</strong> rps</div>
//                 <div style={styles.metaItem}><strong>{ops?.wps ?? 0}</strong> wps</div>
//                 <div style={styles.metaItem}><strong>{alerts ?? 0}</strong> alerts</div>
//             </div>
//
//             <div style={styles.updated}>Updated {timeAgo(updatedAt)}</div>
//         </div>
//     );
// }
//
// function timeAgo(ts){
//     const secs = Math.max(1, Math.floor((Date.now() - ts)/1000));
//     if (secs < 60) return `${secs}s ago`;
//     const mins = Math.floor(secs/60); if (mins < 60) return `${mins}m ago`;
//     const hrs = Math.floor(mins/60); if (hrs < 24) return `${hrs}h ago`;
//     const d = Math.floor(hrs/24); return `${d}d ago`;
// }
//
// const styles = {
//     card: { background: "#0e0e0e", border: "1px solid #222", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
//     topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
//     title: { fontWeight: 600, marginBottom: 6 },
//     badge: { display: "inline-block", fontSize: 12, opacity: 0.8, border: "1px solid #2a2a2a", borderRadius: 999, padding: "2px 8px" },
//     openBtn: { padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#151515", color: "#fff", cursor: "pointer" },
//     progressBar: { height: 8, background: "#1a1a1a", borderRadius: 999, overflow: "hidden", border: "1px solid #222" },
//     progressFill: { height: "100%" },
//     kv: { display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginTop: 4 },
//     metaRow: { display: "flex", gap: 12, fontSize: 13, opacity: 0.9 },
//     metaItem: { border: "1px solid #222", borderRadius: 8, padding: "6px 8px" },
//     updated: { fontSize: 12, opacity: 0.6 }
// };