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

// "use client";
// import { useEffect } from "react";
//
// export default function Modal({ open, onClose, title, children, footer }) {
//     useEffect(() => {
//         function onEsc(e) { if (e.key === "Escape") onClose?.(); }
//         if (open) document.addEventListener("keydown", onEsc);
//         return () => document.removeEventListener("keydown", onEsc);
//     }, [open, onClose]);
//
//     if (!open) return null;
//     return (
//         <div style={styles.backdrop} onMouseDown={onClose}>
//             <div style={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
//                 {title && <div style={styles.header}>{title}</div>}
//                 <div style={styles.body}>{children}</div>
//                 {footer && <div style={styles.footer}>{footer}</div>}
//             </div>
//         </div>
//     );
// }
//
// const styles = {
//     backdrop: {
//         position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
//         display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
//     },
//     dialog: {
//         width: "min(720px, 92vw)", background: "#111", color: "#eee",
//         borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden",
//         border: "1px solid #2a2a2a"
//     },
//     header: { padding: "14px 16px", fontWeight: 600, borderBottom: "1px solid #232323" },
//     body:   { padding: 16 },
//     footer: { padding: 16, display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #232323" }
// };