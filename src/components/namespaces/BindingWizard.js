"use client";
import { useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

export default function BindingWizard({ open, onClose, onSave }) {
    //const [data, setData] = useState({ serviceId: "", serviceName: "", permissions: "R", patterns: [""] });
    //const reset = () => setData({ serviceId: "", serviceName: "", permissions: "R", patterns: [""] });
    const [data, setData] = useState({
            serviceId: "", serviceName: "", permissions: "R",
            patterns: [""], scopes: [], rate: { readRps: 0, writeRps: 0 }
    });
    const reset = () => setData({ serviceId: "", serviceName: "", permissions: "R", patterns: [""], scopes: [], rate: { readRps:0, writeRps:0 } });


    const cancel = () => { reset(); onClose?.(); };
    const save = () => {
        const patterns = data.patterns.map((p) => p.trim()).filter(Boolean);
        //onSave?.({ ...data, patterns });
        const scopes = (data.scopes || []).map(s => s.trim()).filter(Boolean);
        onSave?.({ ...data, patterns, scopes });
        reset();
    };

    const setPattern = (i, val) =>
        setData((d) => ({ ...d, patterns: d.patterns.map((p, idx) => (idx === i ? val : p)) }));

    return (
        <Modal open={open} onClose={cancel} title="Bind Service">
            <div className="space-y-3">
                <Row label="Service ID">
                    <input className="mm-input w-full" value={data.serviceId}
                           onChange={(e) => setData((d) => ({ ...d, serviceId: e.target.value }))} placeholder="checkout-api" />
                </Row>
                <Row label="Service name">
                    <input className="mm-input w-full" value={data.serviceName}
                           onChange={(e) => setData((d) => ({ ...d, serviceName: e.target.value }))} placeholder="Checkout API" />
                </Row>
                <Row label="Permissions">
                    <select className="mm-select w-full" value={data.permissions}
                            onChange={(e) => setData((d) => ({ ...d, permissions: e.target.value }))}>
                        <option value="R">Read</option>
                        <option value="W">Write</option>
                        <option value="RW">Read/Write</option>
                    </select>
                </Row>
                <Row label="Rate limits">
                          <div className="grid grid-cols-2 gap-2">
                            <input className="mm-input" type="number" min={0} placeholder="read rps"
                                   value={data.rate.readRps}
                                   onChange={(e)=>setData(d=>({...d, rate:{...d.rate, readRps:Number(e.target.value||0)}}))}/>
                            <input className="mm-input" type="number" min={0} placeholder="write rps"
                                   value={data.rate.writeRps}
                                   onChange={(e)=>setData(d=>({...d, rate:{...d.rate, writeRps:Number(e.target.value||0)}}))}/>
                          </div>
                </Row>
                <Row label="Scopes">
                          <ScopesEditor value={data.scopes} onChange={(sc)=>setData(d=>({...d, scopes:sc}))} />
                </Row>
                <Row label="Key patterns">
                    <div className="grid gap-2">
                        {data.patterns.map((p, i) => (
                            <div key={i} className="flex gap-2">
                                <input className="mm-input w-full" value={p}
                                       onChange={(e) => setPattern(i, e.target.value)} placeholder="orders:*" />
                                <Button variant="ghost" onClick={() =>
                                    setData((d) => ({ ...d, patterns: d.patterns.filter((_, idx) => idx !== i) }))
                                }>–</Button>
                            </div>
                        ))}
                        <Button variant="ghost" onClick={() => setData((d) => ({ ...d, patterns: [...d.patterns, ""] }))}>
                            + Add pattern
                        </Button>
                    </div>
                </Row>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={cancel}>Cancel</Button>
                    <Button onClick={save} disabled={!data.serviceId.trim()}>Bind</Button>
                </div>
            </div>
        </Modal>
    );
}
function Row({ label, children }) {
    return (
        <label className="grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="opacity-80">{label}</span>
            {children}
        </label>
    );
}

function ScopesEditor({ value = [], onChange }) {
          const [input, setInput] = useState("");
          const add = () => {
                const v = input.trim();
                if (!v) return;
                onChange([...(value||[]), v]);
                setInput("");
              };
          const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
          return (
                <div className="grid gap-2">
                      <div className="flex gap-2">
                        <input className="mm-input w-full" placeholder="e.g. billing.read"
                               value={input} onChange={(e)=>setInput(e.target.value)} />
                        <Button variant="ghost" onClick={add}>+ Add</Button>
                      </div>
                      {!!value?.length && (
                        <div className="flex flex-wrap gap-2">
                              {value.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-xs">
                                    {s}
                                    <button onClick={()=>remove(i)} className="opacity-70 hover:opacity-100">×</button>
                                </span>
                              ))}
                        </div>
                      )}
                </div>
              );
}
