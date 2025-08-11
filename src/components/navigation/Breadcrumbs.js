import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
    return (
        <div className="px-4 pt-2">
            <nav
                aria-label="Breadcrumb"
                className="mm-glass rounded-2xl bg-white/8 border-white/15 px-3 py-2"
            >
                <ol className="flex flex-wrap items-center gap-1 text-sm">
                    {items.map((it, i) => {
                        const last = i === items.length - 1;

                        const node = it.href && !last ? (
                            <Link
                                href={it.href}
                                className="px-1.5 py-0.5 rounded-md text-zinc-100/90 hover:text-white hover:bg-white/15 transition"
                            >
                                {it.label}
                            </Link>
                        ) : (
                            <span
                                className="px-1.5 py-0.5 rounded-md text-white bg-white/12"
                                aria-current={last ? "page" : undefined}
                            >
                {it.label}
              </span>
                        );

                        return (
                            <li key={i} className="flex items-center">
                                {node}
                                {!last && (
                                    <ChevronRight
                                        className="mx-1 h-4 w-4 text-white/40"
                                        aria-hidden="true"
                                    />
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}


// import Link from "next/link";
//
// export default function Breadcrumbs({ items = [] }) {
//     return (
//         <nav className="px-4 pt-2 text-sm text-zinc-400" aria-label="Breadcrumb">
//             <ol className="flex flex-wrap items-center gap-1">
//                 {items.map((it, i) => {
//                     const last = i === items.length - 1;
//                     return (
//                         <li key={i} className="flex items-center gap-1">
//                             {it.href && !last ? (
//                                 <Link href={it.href} className="hover:text-zinc-200">
//                                     {it.label}
//                                 </Link>
//                             ) : (
//                                 <span className="text-zinc-200" aria-current={last ? "page" : undefined}>
//                   {it.label}
//                 </span>
//                             )}
//                             {!last && <span className="opacity-50">/</span>}
//                         </li>
//                     );
//                 })}
//             </ol>
//         </nav>
//     );
// }

// import Link from "next/link";
//
// export default function Breadcrumbs({ items = [] }) {
//     return (
//         <nav className="px-4 pt-2 text-sm text-zinc-400">
//             <ol className="flex flex-wrap items-center gap-1">
//                 {items.map((it, i) => {
//                     const last = i === items.length - 1;
//                     return (
//                         <li key={i} className="flex items-center gap-1">
//                             {it.href && !last ? (
//                                 <Link href={it.href} className="hover:text-zinc-200">{it.label}</Link>
//                             ) : (
//                                 <span className="text-zinc-300">{it.label}</span>
//                             )}
//                             {!last && <span className="opacity-50">/</span>}
//                         </li>
//                     );
//                 })}
//             </ol>
//         </nav>
//     );
// }