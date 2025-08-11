import Link from "next/link";
import StickyNavbar from "@/components/navigation/StickyNavbar";

export default function LandingHome() {
    return (
        <main>
            <StickyNavbar />
            <div className="pt-16 px-5 grid gap-6">
                <section style={styles.hero}>
                    <div style={styles.badge}>MEMORY CONTROL PLANE</div>
                    <h1 style={styles.h1}>MemMouse — Enterprise Memory Management</h1>
                    <p style={styles.sub}>
                        A unified control plane for quotas, namespaces, data contracts, and bridges —
                        with live flow visualization and audit built in.
                    </p>
                    <div style={styles.ctaRow}>
                        <Link href="/projects" style={{ ...btn, ...btnPrimary }}>Get started</Link>
                        {/*<Link href="/contracts" style={{ ...btn, ...btnGhost }}>View contracts</Link>*/}
                    </div>
                </section>
                {/* FEATURES: 2 per row on md+, 1 per row on mobile */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeatureCard
                        title="Projects & Namespaces"
                        body="Organize memory by project. Set quotas, TTL presets, eviction policies, and kill switches per namespace."
                    />
                    <FeatureCard
                        title="Service Bindings"
                        body="Grant per-service access by key patterns and scopes. Rotate tokens and enforce rate limits."
                    />
                    <FeatureCard
                        title="Data Contracts"
                        body="Define key patterns and JSON Schemas. Validate on write, version safely (v1 → v2), and run migrations."
                    />
                    <FeatureCard
                        title="Pipelines & Bridges"
                        body="Mirror namespaces to S3/OLAP or stream events across services. Pause/resume and replay on demand."
                    />
                    <FeatureCard
                        title="Live Events & Audit"
                        body="See key expirations, policy changes, and token rotations in real time. Export audit logs when needed."
                    />
                    <FeatureCard
                        title="Flow Map"
                        body="Visualize how data moves between services and namespaces with throughput, latency, and errors."
                    />
                </section>
                <footer style={styles.footer}>
                    <div>Workspace: <strong>IT department</strong></div>
                    <div style={{ opacity: 0.7 }}>Demo build — auth disabled</div>
                </footer>
            </div>
        </main>
    );
}


function FeatureCard({ title, body }) {
    return (
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>{title}</h3>
            <p style={styles.cardBody}>{body}</p>
        </div>
    );
}

const styles = {
    shell: {
        padding: "32px 20px",
        display: "grid",
        gap: 24,
    },
    hero: {
        borderRadius: 24,
        padding: 28,
        background: "rgba(18,18,22,0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        backdropFilter: "blur(10px)",
    },
    badge: {
        display: "inline-block",
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        marginBottom: 10,
    },
    h1: { margin: "6px 0 10px", fontSize: 28, lineHeight: 1.15 },
    sub: { margin: 0, opacity: 0.8, maxWidth: 860 },
    ctaRow: { display: "flex", gap: 10, marginTop: 18 },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
    },
    card: {
        background: "rgba(16,16,20,0.55)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: 16,
        backdropFilter: "blur(8px)",
    },
    cardTitle: { margin: "2px 0 6px", fontSize: 16 },
    cardBody: { margin: 0, opacity: 0.8, fontSize: 14 },
    footer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        marginTop: 8,
        opacity: 0.9,
    },
};

const btn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    textDecoration: "none",
};
const btnPrimary = {
    background: "rgba(58,134,255,0.25)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
};
const btnGhost = { background: "rgba(255,255,255,0.05)" };