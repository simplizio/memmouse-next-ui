import { NextResponse } from "next/server";

export function middleware(req) {
    const url = req.nextUrl;
    // работаем только на корне
    if (url.pathname !== "/") return NextResponse.next();

    // авто-возврат только если попросили: /?resume=1
    const wantResume = url.searchParams.get("resume") === "1";
    if (!wantResume) return NextResponse.next();

    const last = req.cookies.get("mm_last_route")?.value;
    if (!last || last === "/") return NextResponse.next();

    const target = new URL(last, req.url);
    // защита от петель
    if (target.pathname === url.pathname && target.search === url.search) {
        return NextResponse.next();
    }
    return NextResponse.redirect(target);
}

export const config = { matcher: ["/"] };

// import { NextResponse } from "next/server";
//
// export function middleware(req) {
//     const { pathname } = req.nextUrl;
//     if (pathname === "/") {
//         const last = req.cookies.get("mm_last_route")?.value;
//         if (last && last !== "/") {
//             return NextResponse.redirect(new URL(last, req.url));
//         }
//         return NextResponse.redirect(new URL("/projects", req.url));
//     }
//     return NextResponse.next();
// }
//
// export const config = { matcher: ["/"] };

// import { NextResponse } from "next/server";
//
// export function middleware(req) {
//     const { pathname } = req.nextUrl;
//     if (pathname === "/") {
//         const last = req.cookies.get("mm_last_route")?.value;
//         if (last && last !== "/") {
//             return NextResponse.redirect(new URL(last, req.url));
//         }
//         // return NextResponse.redirect(new URL("/projects", req.url));
//         return NextResponse.redirect(new URL("/", req.url));
//     }
//     return NextResponse.next();
// }
//
// export const config = { matcher: ["/"] };