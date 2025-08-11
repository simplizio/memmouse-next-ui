export default async function NamespaceDetailsPage({ params }) {
    const { id, nsId } = await params;
    return (
        <div>
            <h1 className="text-xl font-semibold mb-3">Namespace</h1>
            <p className="text-zinc-400">Project: <code>{id}</code></p>
            <p className="text-zinc-400">Namespace ID: <code>{nsId}</code></p>
            <p className="text-zinc-400 mt-2">Details coming soon…</p>
        </div>
    );
}
