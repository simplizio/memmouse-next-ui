// Crypto-strong token generator for service API tokens
// ESM module, Node runtime
import { randomUUID, randomBytes } from "node:crypto";

export function makeToken() {
    // mm_<32-hex-from-uuid><16-hex-rand>
    const part1 = randomUUID().replace(/-/g, "");
    const part2 = randomBytes(8).toString("hex");
    return `mm_${part1}${part2}`;
}
