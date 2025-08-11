"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

export default function ServiceEditModal({ open, onClose, service, projectId, onSaved }) {
    const [name, setName] = useState("");
    const [scopes, setScopes] = useState([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        if (!service) return;
        setName(service.name || service.id);
        setScopes(service.scopes || []);
        setInput("");
    }, [service]);

    const addScope = () => {
        const v = input.trim();
        if (!v) return;
        setScopes((s) => [...s, v]);
        setInput("");
    };
    const removeScope = (i) => setScopes((s) => s.filter((_, idx) => idx !== i));

    async function save() {
        const res = await fetch(`/api/projects/${projectId}/services/${service.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), scopes }),
        });
        if (!res.ok) return alert(`Save failed: HTTP ${res.status}`);
        const updated = await res.json();
        onSaved?.(updated);
        onClose?.();
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Edit Service"
            footer={
                <div className="flex w-full items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={!name.trim()}>Save</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <Row label="Display name">
                    <input className="mm-input w-full" value={name} onChange={(e)=>setName(e.target.value)} />
                </Row>
                <Row label="Scopes">
                    <div className="grid gap-2">
                        <div className="flex gap-2">
                            <input className="mm-input w-full" placeholder="orders.read"
                                   value={input} onChange={(e)=>setInput(e.target.value)} />
                            <Button variant="ghost" onClick={addScope}>+ Add</Button>
                        </div>
                        {!!scopes.length && (
                            <div className="flex flex-wrap gap-2">
                                {scopes.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-xs">
                    {s}
                                        <button onClick={()=>removeScope(i)} className="opacity-70 hover:opacity-100">×</button>
                  </span>
                                ))}
                            </div>
                        )}
                    </div>
                </Row>
            </div>
        </Modal>
    );
}

function Row({ label, children }) {
    return (
        <label className="grid grid-cols-[180px_1fr] items-center gap-3 my-2.5">
            <span className="opacity-80">{label}</span>
            {children}
        </label>
    );
}
