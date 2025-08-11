export const runtime = "edge"; // работает и в JS

export async function GET(req) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();

    const interval = setInterval(() => {
        writer.write(enc.encode(`event: tick
data: ${Date.now()}

`));
    }, 5000);

    req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        writer.close();
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}