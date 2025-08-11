export default async function SettingsPage({ params }) {
    const { id } = await params;
    return (
        <div>
            <h1 className="text-xl font-semibold mb-3">Settings</h1>
            <p className="text-zinc-400">Coming soon. Project: <code>{id}</code></p>
        </div>
    );
}


// export default function SettingsPage({ params }) {
//     return (
//         <div>
//             <h1 className="text-xl font-semibold mb-3">Settings</h1>
//             <p className="text-zinc-400">Coming soon. Project: <code>{params.id}</code></p>
//         </div>
//     );
// }
