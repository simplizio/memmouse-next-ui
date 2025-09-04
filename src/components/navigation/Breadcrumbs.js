"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {useBreadcrumbsStore} from "@/store/BreadcrumbStore";

/**
 * Backward-compatible, but more flexible breadcrumbs.
 *
 * Props (all optional):
 * - items: Array<{ label: string, href?: string }>
 */
export default function Breadcrumbs({ items }) {

    // если items не передали — подписываемся на готовый trail из стора
    const data = items?.length ? items : useBreadcrumbsStore(s => s.trail);

    return (
        <div className="px-4 pt-2">
            <nav aria-label="Breadcrumb" className="mm-glass rounded-2xl bg-white/8 border-white/15 px-3 py-2">
                <ol className="flex flex-wrap items-center gap-1 text-sm">
                    {(data || []).map((it, i) => {
                        const last = i === (data || []).length - 1;
                        const node = it.href && !last ? (
                            <Link href={it.href} className="px-1.5 py-0.5 rounded-md text-zinc-100/90 hover:text-white hover:bg-white/15 transition">
                                {it.label}
                            </Link>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded-md text-white bg-white/12" aria-current={last ? "page" : undefined}>
                                {it.label}
                            </span>
                        );
                        return (
                            <li key={i} className="flex items-center">
                                {node}
                                {!last && <ChevronRight className="mx-1 h-4 w-4 text-white/40" aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}
