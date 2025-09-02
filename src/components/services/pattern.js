import { redis } from "@/server/redis/client.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";

// простая glob→regex для стат.проверок
export function globToRegex(glob) {
    const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    return new RegExp("^" + glob.split("*").map(p => p.split("?").map(esc).join(".")).join(".*") + "$");
}

// пересечение наборов паттернов (приближённо по примерам)
export function patternsOverlap(aList, bList, samples = []) {
    // если есть реальные сэмплы — проверяем по ним
    if (samples.length) {
        const aRe = aList.map(globToRegex), bRe = bList.map(globToRegex);
        const inA = k => aRe.some(r => r.test(k));
        const inB = k => bRe.some(r => r.test(k));
        return samples.some(k => inA(k) && inB(k));
    }
    // статическая эвристика: общий префикс до первого '*' совпадает
    const head = g => String(g).split("*")[0];
    return aList.some(a => bList.some(b => head(a) && head(a) === head(b)));
}

function starifyPrefix(prefix) {
    let p = String(prefix || "").trim();
    if (!p) return "*";
    // если префикс уже содержит wildcard — не добавляем дополнительную '*'
    if (p.includes("*")) return p.replace(/\*{2,}/g, "*")
        .replace(/:\*{2,}/g, ":*")
        .replace(/\*+$/g, "*");
    if (!p.endsWith("*")) p += "*";
    return p;
}

// собрать кандидаты паттернов по проекту
export async function suggestPatternsForProject(projectId, samplePerNs = 100) {
    const namespaces = await NamespaceRepo.list(projectId).catch(() => []);
    const bindingsBySvc = new Map(); // serviceId -> [{nsId,keyPatterns}]
    for (const ns of namespaces) {
        const svcIds = await BindingRepo.listServicesForNamespace(projectId, ns.id).catch(() => []);
        for (const sid of svcIds) {
            const b = await BindingRepo.get(projectId, ns.id, sid).catch(() => null);
            if (!b) continue;
            const arr = bindingsBySvc.get(sid) || [];
            arr.push({ nsId: ns.id, keyPatterns: b.keyPatterns || [], permissions: b.permissions || {} });
            bindingsBySvc.set(sid, arr);
        }
    }

    // живые ключи (осторожно: только SCAN с MATCH по ns.prefix, ограниченный)
    const liveByNs = {};
    for (const ns of namespaces) {
        const prefix = ns.prefix || "";
        if (!prefix) { liveByNs[ns.id] = []; continue; }
        const match = `${prefix}*`;
        const out = [];
        let cursor = "0"; let iter = 0;
        do {
            // ограничим обороты, чтобы не грузить прод
            const res = await redis.scan(cursor, "MATCH", match, "COUNT", 500);
            cursor = String(res[0]);
            const keys = res[1] || [];
            for (const k of keys) { out.push(k); if (out.length >= samplePerNs) break; }
            iter++;
            if (out.length >= samplePerNs || iter > 50) break;
        } while (cursor !== "0");
        // можем добавить типизацию нескольких первых ключей
        const typed = [];
        for (let i = 0; i < Math.min(out.length, 20); i++) {
            try {
                const t = await redis.type(out[i]);
                typed.push({ key: out[i], type: t });
            } catch {}
        }
        liveByNs[ns.id] = typed;
    }

    // предложения по паттернам
    const suggestions = namespaces.map(ns => {
        // const base = ns.prefix ? [`${ns.prefix}*`] : [];
        const base = ns.prefix
              ? [starifyPrefix(ns.prefix)]
              : [];
        return {
            nsId: ns.id,
            nsName: ns.name || ns.id,
            base,                                        // предлагаемый базовый паттерн
            live: liveByNs[ns.id],                       // примеры с типами
            existing: Array.from(new Set(               // уже выбранные кем-то в проекте
                (Array.from(bindingsBySvc.values()).flat()
                    .filter(b => b.nsId === ns.id)
                    .flatMap(b => b.keyPatterns || []))
            )),
        };
    });

    return { namespaces, suggestions, bindingsBySvc: Object.fromEntries(bindingsBySvc) };
}

// подсказки по ACL пресетам на основе типов
export function recommendPresetsFromTypes(typedKeys) {
    const hasStream = typedKeys.some(x => x.type === "stream");
    const hasKVwrite = true; // по умолчанию KV, если у сервиса заявлен kv.write
    const out = new Set(["metrics"]);
    if (hasStream) out.add("x_cons"); // консервативно: чтение стримов
    return Array.from(out);
}
