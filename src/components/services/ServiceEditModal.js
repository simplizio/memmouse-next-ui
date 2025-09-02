"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function Chip({ active, onClick, title, desc, defaults }) {
    return (
        <label
            className={`mm-glass rounded-xl p-3 border cursor-pointer transition
      ${active ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 hover:bg-white/5"}`}>
            <div className="flex items-center gap-2">
                <input type="checkbox" className="mm-checkbox" checked={active} onChange={onClick} />
                <div className="font-medium">{title}</div>
            </div>
            {desc && <div className="text-xs opacity-70 mt-1">{desc}</div>}
            {!!defaults?.length && (
                <div className="text-[11px] opacity-60 mt-1">Seeds ACL presets: {defaults.join(", ")}</div>
            )}
        </label>
    );
}

export default function ServiceEditModal({ open, onClose, projectId, service, onSaved }) {
    const [name, setName] = useState(service?.name || "");
    const [description, setDescription] = useState(service?.description || "");
    const [scopeDefs, setScopeDefs] = useState([]);
    const [selectedScopes, setSelectedScopes] = useState(service?.scopes || []);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!open) return;
        setName(service?.name || "");
        setDescription(service?.description || "");
        setSelectedScopes(service?.scopes || []);
        fetch("/api/scopes").then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setScopeDefs(items || []))
            .catch(() => setScopeDefs([]));
    }, [open, service?.id]);

    async function save() {
        setSaving(true); setErr(null);
        try {
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    scopes: selectedScopes,
                }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            onSaved?.(j.service || j);
            onClose?.();
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative mm-glass rounded-2xl w-full max-w-3xl border border-white/10">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="text-lg font-semibold">Edit service</div>
                        <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-white/10">✕</button>
                    </div>

                    <div className="px-5 pt-3 pb-5 max-h-[70vh] overflow-y-auto grid gap-3">
                        <div>
                            <div className="text-sm mb-1 opacity-80">Name</div>
                            <input className="mm-input w-full" value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div>
                            <div className="text-sm mb-1 opacity-80">Scopes</div>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {scopeDefs.map(s => {
                                    const active = selectedScopes.includes(s.name);
                                    return (
                                        <Chip
                                            key={s.name}
                                            active={active}
                                            onClick={() =>
                                                setSelectedScopes(prev => prev.includes(s.name)
                                                    ? prev.filter(n => n !== s.name)
                                                    : [...prev, s.name])}
                                            title={s.title || s.name}
                                            desc={s.desc}
                                            defaults={s.defaultPresets}
                                        />
                                    );
                                })}
                            </div>
                            <div className="text-xs text-zinc-400 mt-1">
                                Scopes are capabilities (not key prefixes). Prefixes live in Bindings.
                            </div>
                        </div>

                        <div>
                            <div className="text-sm mb-1 opacity-80">Description (optional)</div>
                            <textarea className="mm-input w-full min-h-[80px]" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        {err && <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{err}</div>}
                    </div>

                    <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// "use client";
// import { useEffect, useState } from "react";
// import Modal from "@/components/common/Modal";
// import { Button } from "@/components/ui/button";
//
// export default function ServiceEditModal({ open, onClose, service, projectId, onSaved }) {
//     const [name, setName] = useState("");
//     const [scopes, setScopes] = useState([]);
//     const [input, setInput] = useState("");
//
//     useEffect(() => {
//         if (!service) return;
//         setName(service.name || service.id);
//         setScopes(service.scopes || []);
//         setInput("");
//     }, [service]);
//
//     const addScope = () => {
//         const v = input.trim();
//         if (!v) return;
//         setScopes((s) => [...s, v]);
//         setInput("");
//     };
//     const removeScope = (i) => setScopes((s) => s.filter((_, idx) => idx !== i));
//
//     async function save() {
//         const res = await fetch(`/api/projects/${projectId}/services/${service.id}`, {
//             method: "PATCH",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ name: name.trim(), scopes }),
//         });
//         if (!res.ok) return alert(`Save failed: HTTP ${res.status}`);
//         const updated = await res.json();
//         onSaved?.(updated);
//         onClose?.();
//     }
//
//     return (
//         <Modal
//             open={open}
//             onClose={onClose}
//             title="Edit Service"
//             footer={
//                 <div className="flex w-full items-center justify-end gap-2">
//                     <Button variant="ghost" onClick={onClose}>Cancel</Button>
//                     <Button onClick={save} disabled={!name.trim()}>Save</Button>
//                 </div>
//             }
//         >
//             <div className="space-y-3">
//                 <Row label="Display name">
//                     <input className="mm-input w-full" value={name} onChange={(e)=>setName(e.target.value)} />
//                 </Row>
//                 <Row label="Scopes">
//                     <div className="grid gap-2">
//                         <div className="flex gap-2">
//                             <input className="mm-input w-full" placeholder="orders.read"
//                                    value={input} onChange={(e)=>setInput(e.target.value)} />
//                             <Button variant="ghost" onClick={addScope}>+ Add</Button>
//                         </div>
//                         {!!scopes.length && (
//                             <div className="flex flex-wrap gap-2">
//                                 {scopes.map((s, i) => (
//                                     <span key={i} className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-xs">
//                     {s}
//                                         <button onClick={()=>removeScope(i)} className="opacity-70 hover:opacity-100">×</button>
//                   </span>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 </Row>
//             </div>
//         </Modal>
//     );
// }
//
// function Row({ label, children }) {
//     return (
//         <label className="grid grid-cols-[180px_1fr] items-center gap-3 my-2.5">
//             <span className="opacity-80">{label}</span>
//             {children}
//         </label>
//     );
// }
