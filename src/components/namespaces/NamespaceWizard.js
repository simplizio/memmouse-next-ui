"use client";
import { useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { blankNamespace } from "@/lib/mockNamespaces";

export default function NamespaceWizard({ open, onClose, onCreate, projectId }) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState(blankNamespace(projectId));

    const reset = () => { setStep(1); setData(blankNamespace(projectId)); };
    const cancel = () => { reset(); onClose?.(); };
    const next = () => setStep((s) => Math.min(3, s + 1));
    const prev = () => setStep((s) => Math.max(1, s - 1));
    const finish = () => { onCreate?.({ ...data, id: data.prefix.replace(/\W/g,"_") }); reset(); };

    const canNext =
        (step === 1 && data.prefix.trim().length > 0) ||
        step === 2 || step === 3;

    return (
        <Modal
            open={open}
            onClose={cancel}
            title={`New Namespace — Step ${step} / 3`}
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button variant="ghost" onClick={cancel}>Cancel</Button>
                    <div className="flex gap-2">
                        {step > 1 && <Button variant="ghost" onClick={prev}>Back</Button>}
                        {step < 3 && <Button onClick={next} disabled={!canNext}>Next</Button>}
                        {step === 3 && <Button onClick={finish}>Create Namespace</Button>}
                    </div>
                </div>
            }
        >
            {step === 1 && <Step1 data={data} setData={setData} />}
            {step === 2 && <Step2 data={data} setData={setData} />}
            {step === 3 && <Step3 data={data} setData={setData} />}
        </Modal>
    );
}

const Row = ({ label, children }) => (
    <label className="grid grid-cols-[180px_1fr] items-center gap-3 my-2.5">
        <span className="opacity-80">{label}</span>
        {children}
    </label>
);
const Input = (p)=><input {...p} className="mm-input w-full"/>;
const Select=(p)=><select {...p} className="mm-select w-full"/>;

function Step1({ data, setData }) {
    return (
        <div>
            <Row label="Key prefix">
                <Input
                    placeholder="e.g. orders:*"
                    value={data.prefix}
                    onChange={(e)=>setData(d=>({...d, prefix:e.target.value}))}
                    autoFocus
                />
            </Row>
            <Row label="Status">
                <Select value={data.status} onChange={(e)=>setData(d=>({...d, status:e.target.value}))}>
                    <option value="active">active</option>
                    <option value="frozen">frozen</option>
                </Select>
            </Row>
        </div>
    );
}

function Step2({ data, setData }) {
    return (
        <div>
            <Row label="Quota (GB)">
                <Input type="number" min={1}
                       value={Math.round((data.quotaBytes||0)/1024/1024/1024)}
                       onChange={(e)=>setData(d=>({...d, quotaBytes: Number(e.target.value||0) * 1024**3}))}
                />
            </Row>
            <Row label="Default TTL">
                <Select value={data.ttl} onChange={(e)=>setData(d=>({...d, ttl:e.target.value}))}>
                    <option value="none">No default</option>
                    <option value="1h">1 hour</option>
                    <option value="24h">24 hours</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                </Select>
            </Row>
            <Row label="Eviction">
                <Select value={data.eviction} onChange={(e)=>setData(d=>({...d, eviction:e.target.value}))}>
                    <option value="noeviction">noeviction</option>
                    <option value="volatile-lru">volatile-lru</option>
                    <option value="allkeys-lru">allkeys-lru</option>
                    <option value="volatile-ttl">volatile-ttl</option>
                </Select>
            </Row>
        </div>
    );
}

function Step3({ data, setData }) {
    return (
        <div>
            <Row label="Encryption at rest">
                <input type="checkbox"
                       checked={data.encryption?.atRest ?? true}
                       onChange={(e)=>setData(d=>({...d, encryption:{...d.encryption, atRest:e.target.checked}}))}
                />
            </Row>
            <Row label="Encryption in flight">
                <input type="checkbox"
                       checked={data.encryption?.inFlight ?? true}
                       onChange={(e)=>setData(d=>({...d, encryption:{...d.encryption, inFlight:e.target.checked}}))}
                />
            </Row>
        </div>
    );
}
