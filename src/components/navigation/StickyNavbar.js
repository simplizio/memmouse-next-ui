"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import memmouseLogo from "@/assets/img/memmouse-logo-fill-bg.png";

function NavLink({ href, children }) {
    const pathname = usePathname();
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-1.5 rounded-xl border transition ${
                active ? "border-white/20 bg-white/20 shadow-sm"
                    : "border-white/10 hover:bg-white/10 hover:border-white/15"
            }`}
        >
            {children}
        </Link>
    );
}

export default function StickyNavbar() {
    return (
        <div className="sticky top-0 z-50">
            <div className="relative mm-glass bg-white/8 dark:bg-white/5 border-0 border-b border-white/15">
                <div className="max-w-7xl mx-auto w-full flex h-14 items-center gap-4 px-4">
                    {/* Brand with glow + ring */}
                    <Link href="/" className="flex items-center gap-2">
            <span className="relative grid place-items-center">
              {/* subtle radial glow behind the logo */}
                <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-2 rounded-xl blur-md opacity-60
                           bg-[radial-gradient(closest-side,rgba(255,255,255,0.45),transparent)]"
                />
                {/* thin stroke/ring */}
                {/*<span*/}
                {/*    aria-hidden*/}
                {/*    className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/30"*/}
                {/*/>*/}
              <Image
                  src={memmouseLogo}
                  alt="MemMouse"
                  width={50}
                  height={50}
                  className="relative rounded drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]"
                  priority
              />
            </span>
                        <span className="text-white text-base sm:text-lg font-semibold tracking-tight">
              MemMouse
            </span>
                    </Link>

                    <nav className="ml-6 hidden sm:flex items-center gap-2">
                        <NavLink href="/projects">Projects</NavLink>
                        {/*<NavLink href="/contracts">Contracts</NavLink>*/}
                    </nav>

                    <div className="ml-auto text-xs opacity-70">Demo build</div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
        </div>
    );
}
