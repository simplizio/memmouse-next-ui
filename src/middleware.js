import { NextResponse } from "next/server";

export function middleware(req) {
    const url = req.nextUrl;
    // working at the root only
    if (url.pathname !== "/") return NextResponse.next();

    // auto-return only when needed: /?resume=1
    const wantResume = url.searchParams.get("resume") === "1";
    if (!wantResume) return NextResponse.next();

    const last = req.cookies.get("mm_last_route")?.value;
    if (!last || last === "/") return NextResponse.next();

    const target = new URL(last, req.url);
    // loops prevention
    if (target.pathname === url.pathname && target.search === url.search) {
        return NextResponse.next();
    }
    return NextResponse.redirect(target);
}

export const config = { matcher: ["/"] };
