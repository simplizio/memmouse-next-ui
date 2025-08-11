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

// "use client";
// import Link from "next/link";
// import Image from "next/image";
// import { usePathname } from "next/navigation";
// import memmouseLogo from "@/assets/img/memmouse-logo-fill-bg.png";
//
// function NavLink({ href, children }) {
//     const pathname = usePathname();
//     const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
//
//     return (
//         <Link
//             href={href}
//             aria-current={active ? "page" : undefined}
//             className={`px-3 py-1.5 rounded-xl border transition
//         ${active
//                 ? "border-white/20 bg-white/20 shadow-sm"
//                 : "border-white/10 hover:bg-white/10 hover:border-white/15"
//             }`}
//         >
//             {children}
//         </Link>
//     );
// }
//
// export default function StickyNavbar() {
//     return (
//         <div className="sticky top-0 z-50">
//             {/* glass bar */}
//             <div className="relative mm-glass bg-white/8 dark:bg-white/5 border-0 border-b border-white/15">
//                 <div className="max-w-7xl mx-auto w-full flex h-14 items-center gap-4 px-4">
//                     {/* Brand */}
//                     <Link href="/" className="flex items-center gap-2">
//                         <Image
//                             src={memmouseLogo}
//                             alt="MemMouse"
//                             width={50}
//                             height={50}
//                             className="rounded"
//                             priority
//                         />
//                         <span className="text-white text-base sm:text-lg font-semibold tracking-tight">
//               MemMouse
//             </span>
//                     </Link>
//
//                     {/* Nav */}
//                     <nav className="ml-6 hidden sm:flex items-center gap-2">
//                         <NavLink href="/projects">Projects</NavLink>
//                         <NavLink href="/contracts">Contracts</NavLink>
//                     </nav>
//
//                     {/* Right side */}
//                     <div className="ml-auto text-xs opacity-70">Demo build</div>
//                 </div>
//
//                 {/* hairline glow */}
//                 <div
//                     className="pointer-events-none absolute inset-x-0 bottom-0 h-px
//                      bg-gradient-to-r from-transparent via-white/25 to-transparent"
//                 />
//             </div>
//         </div>
//     );
// }


// "use client";
// import Link from "next/link";
// import Image from "next/image";               // <-- важно
// import { usePathname } from "next/navigation";
// import memmouseLogo from "@/assets/img/memmouse-logo-fill-bg.png";
//
// function NavLink({ href, children }) {
//     const pathname = usePathname();
//     const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
//     return (
//         <Link
//             href={href}
//             className={`px-3 py-1.5 rounded-xl border border-white/10 transition ${
//                 active ? "bg-white/15" : "hover:bg-white/10"
//             }`}
//         >
//             {children}
//         </Link>
//     );
// }
//
// export default function StickyNavbar() {
//     return (
//         <div className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-white/10">
//             <div className="max-w-7xl mx-auto w-full flex h-14 items-center gap-3 px-4">
//                 {/* Brand */}
//                 <Link href="/" className="flex items-center gap-2">
//                     <Image
//                         src={memmouseLogo}
//                         alt="MemMouse"
//                         width={48}
//                         height={48}
//                         className="rounded"
//                         priority
//                     />
//                     <span className="text-white text-lg font-semibold tracking-tight">
//             MemMouse
//           </span>
//                 </Link>
//
//                 {/* Nav */}
//                 <nav className="ml-6 flex items-center gap-2">
//                     <NavLink href="/projects">Projects</NavLink>
//                     <NavLink href="/contracts">Contracts</NavLink>
//                 </nav>
//
//                 {/* Right side */}
//                 <div className="ml-auto text-xs opacity-70">Demo build</div>
//             </div>
//         </div>
//     );
// }

// "use client";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import memmouse_logo from '@/assets/img/memmouse-logo-fill-bg.png';
//
// function NavLink({ href, children }) {
//     const pathname = usePathname();
//     const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
//     return (
//         <Link
//             href={href}
//             className={`px-3 py-1.5 rounded-xl border border-white/10 transition
//         ${active ? "bg-white/15" : "hover:bg-white/10"}`}
//         >
//             {children}
//         </Link>
//     );
// }
//
// export default function StickyNavbar() {
//     return (
//         <div className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-white/10">
//             <div className="mx-auto flex h-14 items-center gap-3 px-4">
//                 <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
//                     <Image
//                         src={memmouse_logo}
//                         alt="MemMouse"
//                         width={32}
//                         height={32}
//                         className="rounded mr-3"
//                         priority
//                     />
//                     <span className="text-white text-xl font-semibold tracking-tight">
//                               <Link href="/" className="font-semibold tracking-tight mr-1">MemMouse</Link>
//                     </span>
//                 </div>
//
//                 <div className="flex items-center gap-2">
//                     <NavLink href="/projects">Projects</NavLink>
//                     <NavLink href="/contracts">Contracts</NavLink>
//                 </div>
//                 <div className="ml-auto text-xs opacity-70">Demo build</div>
//             </div>
//         </div>
//     );
// }

// 'use client';
//
// import { useEffect, useState } from "react";
// import Image from "next/image";
// import memmouse_logo from '@/assets/img/memmouse-logo-fill-bg.png';
//
// export default function StickyNavbar() {
//     const [scrolled, setScrolled] = useState(false);
//     useEffect(() => {
//         const onScroll = () => setScrolled(window.scrollY > 20);
//         window.addEventListener("scroll", onScroll);
//         return () => window.removeEventListener("scroll", onScroll);
//     }, []);
//
//     return (
//         <nav
//             className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center
//                   transition-colors duration-300 backdrop-blur-md
//                   ${scrolled ? "bg-gray-900/90 shadow-md" : "bg-gray-900/40"}`}
//         >
//             <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
//                 <Image
//                     src={memmouse_logo}
//                     alt="MemMouse"
//                     width={32}
//                     height={32}
//                     className="rounded mr-3"
//                     priority
//                 />
//                 <span className="text-white text-xl font-semibold tracking-tight">
//           MemMouse
//         </span>
//             </div>
//         </nav>
//     );
// }
