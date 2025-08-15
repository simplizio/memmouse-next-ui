"use client";
import { useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

function initialForm() {
    return {
        name: "",
        department: "",
        quotaBytes: 8 * 1024 ** 3,
        defaultTtl: "none",
        eviction: "noeviction",
        alert80: true,
        alert90: true,
        alert100: true,
        notify: "none",
    };
}

export default function ProjectWizard({ open, onClose, onCreate }) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState(initialForm());

    const reset = () => { setStep(1); setData(initialForm()); };
    const cancel = () => { reset(); onClose?.(); };
    const next = () => setStep(s => Math.min(3, s + 1));
    const prev = () => setStep(s => Math.max(1, s - 1));

    const canNext =
        (step === 1 && data.name.trim().length > 0) ||
        step === 2 ||
        step === 3;

    async function finish() {
        // send it upwards, and then POST to /api/projects and then reload
        await onCreate?.({ ...data, updatedAt: Date.now() });
        reset();
    }

    return (
        <Modal
            open={open}
            onClose={cancel}
            title={`New Project — Step ${step} / 3`}
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button variant="ghost" onClick={cancel}>Cancel</Button>
                    <div className="flex gap-2">
                        {step > 1 && <Button variant="ghost" onClick={prev}>Back</Button>}
                        {step < 3 && <Button onClick={next} disabled={!canNext}>Next</Button>}
                        {step === 3 && <Button onClick={finish}>Create Project</Button>}
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
const Input = (p) => <input {...p} className="mm-input w-full" />;
const Select = (p) => <select {...p} className="mm-select w-full" />;

function Step1({ data, setData }) {
    return (
        <div>
            <Row label="Project name">
                <Input
                    value={data.name}
                    onChange={(e) => setData(d => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Checkout"
                    autoFocus
                />
            </Row>
            <Row label="Department">
                <Select
                    value={data.department}
                    onChange={(e) => setData(d => ({ ...d, department: e.target.value }))}
                >
                    <option value="">Select…</option>
                    <option>Risk</option>
                    <option>Marketing</option>
                    <option>Commerce</option>
                    <option>R&D</option>
                    <option>Support</option>
                </Select>
            </Row>
        </div>
    );
}

function Step2({ data, setData }) {
    return (
        <div>
            <Row label="Quota (GB)">
                <Input
                    type="number" min={1}
                    value={Math.round((data.quotaBytes || 0) / 1024 / 1024 / 1024)}
                    onChange={(e) => setData(d => ({ ...d, quotaBytes: Number(e.target.value || 0) * 1024 ** 3 }))}
                />
            </Row>
            <Row label="Default TTL">
                <Select value={data.defaultTtl} onChange={(e)=>setData(d=>({...d, defaultTtl: e.target.value}))}>
                    <option value="none">No default</option>
                    <option value="1h">1 hour</option>
                    <option value="24h">24 hours</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                </Select>
            </Row>
            <Row label="Eviction">
                <Select value={data.eviction} onChange={(e)=>setData(d=>({...d, eviction: e.target.value}))}>
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
            <Row label="Alert 80% quota">
                <input type="checkbox" checked={data.alert80} onChange={(e)=>setData(d=>({...d, alert80:e.target.checked}))}/>
            </Row>
            <Row label="Alert 90% quota">
                <input type="checkbox" checked={data.alert90} onChange={(e)=>setData(d=>({...d, alert90:e.target.checked}))}/>
            </Row>
            <Row label="Alert 100% quota">
                <input type="checkbox" checked={data.alert100} onChange={(e)=>setData(d=>({...d, alert100:e.target.checked}))}/>
            </Row>
            <Row label="Notify via">
                <Select value={data.notify} onChange={(e)=>setData(d=>({...d, notify:e.target.value}))}>
                    <option value="none">None</option>
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                </Select>
            </Row>
        </div>
    );
}
