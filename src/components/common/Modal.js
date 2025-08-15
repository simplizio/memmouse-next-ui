"use client";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, footer }) {
    useEffect(() => {
        if (!open) return;
        const onEsc = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/50" onMouseDown={onClose} />
            {/* dialog */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="mm-glass w-[min(720px,92vw)] rounded-2xl overflow-hidden border border-white/15"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="font-semibold">{title}</div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-xl border border-white/10 px-2 py-1 hover:bg-white/10"
                        >
                            ×
                        </button>
                    </div>

                    <div className="p-4">{children}</div>

                    {footer && (
                        <div className="border-t border-white/10 px-4 py-3 flex justify-end gap-2">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
