"use client";
import { useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

export default function ServiceWizard({ open, onClose, onCreated, projectId }) {
    const [data, setData] = useState({ id: "", name: "", scopes: [] });
    const [inputScope, setInputScope] = useState("");

    const reset = () => { setData({ id: "", name: "", scopes: [] }); setInputScope(""); };
    const cancel = () => { reset(); onClose?.(); };

    const addScope = () => {
        const v = inputScope.trim();
        if (!v) return;
        setData(d => ({ ...d, scopes: [...d.scopes, v] }));
        setInputScope("");
    };
    const removeScope = (i) => setData(d => ({ ...d, scopes: d.scopes.filter((_, idx) => idx !== i) }));

    async function create() {
        const body = { id: data.id.trim(), name: data.name.trim(), scopes: data.scopes };
        if (!body.id) return;
        const r = await fetch(`/api/projects/${projectId}/services`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!r.ok) return alert(`Create failed: HTTP ${r.status}`);
        await onCreated?.();
        reset();
    }

    return (
        <Modal
            open={open}
            onClose={cancel}
            title="New Service"
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button variant="ghost" onClick={cancel}>Cancel</Button>
                    <Button onClick={create} disabled={!data.id.trim()}>Create</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <Row label="Service ID">
                    <input className="mm-input w-full" placeholder="checkout-api"
                           value={data.id} onChange={(e)=>setData(d=>({...d, id:e.target.value}))} autoFocus />
                </Row>
                <Row label="Display name">
                    <input className="mm-input w-full" placeholder="Checkout API"
                           value={data.name} onChange={(e)=>setData(d=>({...d, name:e.target.value}))} />
                </Row>
                <Row label="Scopes">
                    <div className="grid gap-2">
                        <div className="flex gap-2">
                            <input className="mm-input w-full" placeholder="orders.read"
                                   value={inputScope} onChange={(e)=>setInputScope(e.target.value)} />
                            <Button variant="ghost" onClick={addScope}>+ Add</Button>
                        </div>
                        {!!data.scopes.length && (
                            <div className="flex flex-wrap gap-2">
                                {data.scopes.map((s, i) => (
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
