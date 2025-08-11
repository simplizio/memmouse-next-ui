"use client";
import { useEffect, useState } from "react";

export default function ProjectEventsFeed({ projectId }) {
    const [items, setItems] = useState(null);

    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                const r = await fetch(`/api/projects/${projectId}/events`, { cache: "no-store" });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const { items } = await r.json();
                if (!cancel) setItems(items || []);
            } catch { if (!cancel) setItems([]); }
        }
        load();
        return () => { cancel = true; };
    }, [projectId]);

    if (items === null) return <div className="p-2 text-zinc-400">Loading…</div>;
    if (!items.length) return <div className="p-2 text-zinc-400">No recent events.</div>;

    return (
        <div className="grid gap-2">
            {items.map((ev, i) => (
                <div key={i} className="mm-glass rounded-xl p-2 text-sm">
                    <span className="opacity-70">{new Date(ev.ts).toLocaleString()}</span>{" — "}
                    <span className="font-medium">{ev.type}</span>
                    {ev.message ? <> — <span className="opacity-90">{ev.message}</span></> : null}
                </div>
            ))}
        </div>
    );
}
