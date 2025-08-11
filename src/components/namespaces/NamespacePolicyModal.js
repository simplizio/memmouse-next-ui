"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

export default function NamespacePolicyModal({ open, onClose, ns, onSaved, projectId }) {
    const [form, setForm] = useState({ quotaGB: 8, ttl: "none", eviction: "noeviction" });
    useEffect(() => {
        if (!ns) return;
        setForm({
            quotaGB: Math.max(1, Math.round((ns.quotaBytes || 0) / 1024 / 1024 / 1024)) || 8,
            ttl: ns.ttl || "none",
            eviction: ns.eviction || "noeviction",
        });
    }, [ns]);

    async function save() {
        const body = {
            quotaBytes: Number(form.quotaGB) * 1024 ** 3,
            ttl: form.ttl,
            eviction: form.eviction,
        };
        const res = await fetch(`/api/projects/${projectId}/namespaces/${ns.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (res.ok) {
            const updated = await res.json();
            onSaved?.(updated);
            onClose?.();
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Edit namespace policy"
               footer={
                   <div className="flex w-full items-center justify-end gap-2">
                       <Button variant="ghost" onClick={onClose}>Cancel</Button>
                       <Button onClick={save}>Save</Button>
                   </div>
               }
        >
            <div className="space-y-3">
                <Row label="Quota (GB)">
                    <input className="mm-input w-full" type="number" min={1}
                           value={form.quotaGB} onChange={(e)=>setForm(f=>({...f, quotaGB:e.target.value}))}/>
                </Row>
                <Row label="Default TTL">
                    <select className="mm-select w-full" value={form.ttl}
                            onChange={(e)=>setForm(f=>({...f, ttl:e.target.value}))}>
                        <option value="none">No default</option>
                        <option value="1h">1 hour</option>
                        <option value="24h">24 hours</option>
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                    </select>
                </Row>
                <Row label="Eviction">
                    <select className="mm-select w-full" value={form.eviction}
                            onChange={(e)=>setForm(f=>({...f, eviction:e.target.value}))}>
                        <option value="noeviction">noeviction</option>
                        <option value="volatile-lru">volatile-lru</option>
                        <option value="allkeys-lru">allkeys-lru</option>
                        <option value="volatile-ttl">volatile-ttl</option>
                    </select>
                </Row>
            </div>
        </Modal>
    );
}
function Row({ label, children }) {
    return <label className="grid grid-cols-[180px_1fr] items-center gap-3 my-2.5">
        <span className="opacity-80">{label}</span>{children}
    </label>;
}
