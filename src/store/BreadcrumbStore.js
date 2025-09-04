"use client";
import { create } from "zustand";

// порядок ролей (можно расширять без ломки API)
const ROLE_ORDER = {
    projects: 10,
    project: 20,
    section: 30,        // "services" | "namespaces" | ...
    service: 40,
    namespace: 50,
    extra: 60,
};

const breadcrumbsConfig = function () {
    const ROLE_REFS = {
        projects: {
            roleId: ROLE_ORDER["projects"],
            href: (c) => `/projects`,
            label: (c) => `Projects`
        },
        project: {
            roleId: ROLE_ORDER["project"],
            href: (c) => c.projectId? `/projects/${c.projectId}`:`/projects`,
            label: (l) => l.projectName? l.projectName : l.projectId? l.projectId : "project __"
        },
        section: {
            roleId: ROLE_ORDER["section"],
            href: (c) => `/projects/${c.projectId}/${c.sectionId}`,
            label: (l) => l.sectionName? l.sectionName : l.sectionId? l.sectionId : "section __"
        },
        service: {
            roleId: ROLE_ORDER["service"],
            href: (c) => `/projects/${c.projectId}/services/${c.id}`,
            label: (l) => l.serviceName? l.serviceName : l.id? l.id : "service __",
        },
        namespace: {
            roleId: ROLE_ORDER["namespace"],
            href: (c) => `/projects/${c.projectId}/namespaces/${c.id}`,
            label: (l) => l.nsName? l.nsName : l.id? l.id : "namespace __",
        },
        extra: {
            roleId: ROLE_ORDER["extra"],
        }
    };

    function hrefByRole(item){
        if (!item || item.href) return item;
        return ROLE_REFS[item.role].href? {...item, href: ROLE_REFS[item.role].href(item)} : item;
    }

    function chooseLabel(item){
        if (item.role && ROLE_REFS[item.role] && ROLE_REFS[item.role].label){
            return {...item, label: ROLE_REFS[item.role].label(item)};
        } else {
            return item;
        }
    }

    return {
        hrefFromRole: hrefByRole,
        labelOf: chooseLabel
    };
}();


function keyOf(c) {
    // уникальный ключ на случай нескольких extra
    return c.role === "extra" ? `extra:${c.label}` : c.role;
}

function sameTrail(a, b) {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
            const x = a[i], y = b[i];
            if (!x || !y) return false;
            if (x.label !== y.label || x.href !== y.href || x.role !== y.role) return false;
          }
      return true;
    }

export const useBreadcrumbsStore = create((set, get) => ({
    // Map<string, Crumb> + готовый trail для подписки
    byRole: new Map(),
    trail: [],

    // пересчитываем trail РОВНО когда меняется byRole
    _commit() {
        const items = Array.from(get().byRole.values())
                            .map(breadcrumbsConfig.labelOf)
                            .map(breadcrumbsConfig.hrefFromRole)
                            .sort((a,b) => (ROLE_ORDER[a.role] ?? 999) - (ROLE_ORDER[b.role] ?? 999));
          const prev = get().trail;
          if (!sameTrail(prev, items)) set({ trail: items });
        },

    /** Drop a crumb by role (or by label for extra). */
    drop(roleOrKey) {
        set(s => {
            const m = new Map(s.byRole);
            m.delete(roleOrKey);
            return { byRole: m };
        });
        get()._commit();
    },

    /** Clear all crumbs, e.g. leaving projects area. */
    clear() {
        set({ byRole: new Map() });
        set({ byRole: new Map(), trail: [] });
    },

    /**
     * Универсально: объявить текущий сегмент (role),
     * стереть всё глубже (по ROLE_ORDER), опционально дописать хвост (extras).
     */
    announce(c, extras = []) {
        const order = ROLE_ORDER[c.role] ?? 999;
        set(s => {
            const m = new Map(s.byRole);
            // вычищаем все роли глубже текущей
            for (const [k, v] of Array.from(m.entries())) {
                if ((ROLE_ORDER[v.role] ?? 999) >= order) m.delete(k);
            }
            // ставим себя
            m.set(keyOf(c), breadcrumbsConfig.labelOf(c));
            // дописываем хвост (каждый extra — отдельный элемент с ролью 'extra')
            extras.forEach(x => {
                m.set(keyOf({ role: "extra", label: x.label }), breadcrumbsConfig.labelOf({ role: "extra", ...x }));
            });
            return { byRole: m };
        });
        get()._commit();
    },

    /** Добавить хвост (не меняя текущие роли) */
    extend(extras = []) {
        set(s => {
            const m = new Map(s.byRole);
            extras.forEach(x => {
                m.set(keyOf({ role: "extra", label: x.label }), breadcrumbsConfig.labelOf({ role: "extra", ...x }));
            });
            return { byRole: m };
        });
        get()._commit();
    },
}));

