export default async function EventsPage({ params }) {
    const { id } = await params;
    return (
        <div>
            <h1 className="text-xl font-semibold mb-3">Events</h1>
            <p className="text-zinc-400">Coming soon. Project: <code>{id}</code></p>
        </div>
    );
}
