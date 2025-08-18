"use client";

import { useState } from "react";

export default function CopyField({ label, value, masked=false, className="" }) {
    const [copied, setCopied] = useState(false);
    const shown = masked ? "•".repeat(Math.min(12, String(value||"").length)) + "…" : value;

    async function copy() {
        try {
            await navigator.clipboard.writeText(String(value ?? ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {}
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="min-w-28 text-xs uppercase opacity-75">{label}</div>
            <div className="flex-1 mm-glass px-3 py-1.5 rounded-xl border border-white/15 font-mono break-all text-sm">
                {shown || "—"}
            </div>
            <button
                onClick={copy}
                className="px-2 py-1 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-xs"
            >
                {copied ? "Copied" : "Copy"}
            </button>
        </div>
    );
}
