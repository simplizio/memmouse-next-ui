"use client";

import { forwardRef, useEffect, useMemo, useRef, useImperativeHandle, useCallback } from "react";
import BindingWidget from "./BindingWidget";
import { useBindingManagerStore } from "@/store/BindingManagerStore";

const BindingManager = forwardRef(function BindingManager(
    { projectId, serviceId, namespaces = [], initialBindings = [], onSavedOne, onSavedAll, onDraftChange },
    ref
) {
    const bmStore = useBindingManagerStore();

    // одна инициализация на набор входных данных (стор сам защищён _nsIdsKey)
    useEffect(() => {
        bmStore.initForNamespaces(namespaces, initialBindings);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [namespaces, initialBindings]);

    // стабильный репорт для превью шага 4
    const reportUp = useCallback(() => {
        onDraftChange?.(bmStore.getSelectedDrafts());
    }, [onDraftChange, bmStore.getSelectedDrafts]);

    // на каждый ns свой стабильный хендлер, чтобы эффект в child не зацикливался
    const draftHandlersRef = useRef({});
    const getDraftHandler = (nsId) => {
        if (!draftHandlersRef.current[nsId]) {
            draftHandlersRef.current[nsId] = (d) => { bmStore.setDraft(nsId, d); reportUp(); };
        }
        return draftHandlersRef.current[nsId];
    };

    // панели
    const nsIds = useMemo(() => namespaces.map(n => n.id), [namespaces]);
    const onExpandAll  = () => bmStore.setOpenAll(nsIds, true);
    const onCollapseAll= () => bmStore.setOpenAll(nsIds, false);
    const onSelectAll  = () => { bmStore.setSelectedAll(nsIds, true);  reportUp(); };
    const onSelectNone = () => { bmStore.setSelectedAll(nsIds, false); reportUp(); };

    // императивный API для визарда
    useImperativeHandle(ref, () => ({
        async saveAll(overrideServiceId) {
            const res = await bmStore.saveAll({ projectId, serviceId: overrideServiceId || serviceId, namespaces });
            onSavedAll?.(res); return res;
        },
        getSelectedDrafts() { return bmStore.getSelectedDrafts(); },
        getSelectedNsIds()  { return bmStore.getSelectedNsIds(); },
    }), [projectId, serviceId, namespaces, bmStore.saveAll, bmStore.getSelectedDrafts, bmStore.getSelectedNsIds, onSavedAll]);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
                <button className="px-2 py-1 rounded-xl border border-white/10 hover:bg-white/10" onClick={onExpandAll}>Expand all</button>
                <button className="px-2 py-1 rounded-xl border border-white/10 hover:bg-white/10" onClick={onCollapseAll}>Collapse all</button>
                <div className="mx-2 opacity-40">|</div>
                <button className="px-2 py-1 rounded-xl border border-white/10 hover:bg-white/10" onClick={onSelectAll}>Select all</button>
                <button className="px-2 py-1 rounded-xl border border-white/10 hover:bg-white/10" onClick={onSelectNone}>Select none</button>
            </div>

            {namespaces.map((ns) => {
                const isOpen = !!bmStore.openMap[ns.id];
                const isChecked = !!bmStore.selectedMap[ns.id];
                const initialForWidget = bmStore.drafts?.[ns.id]; // персистентный драфт

                return (
                    <div key={ns.id} className="rounded-2xl border border-white/10 bg-white/5">
                        <div className="flex items-center justify-between px-3 py-2">
                            <button
                                type="button"
                                className="flex-1 flex items-center justify-between text-left"
                                onClick={() => bmStore.toggleOpen(ns.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="opacity-70">{isOpen ? "▾" : "▸"}</div>
                                    <div className="font-medium tracking-tight">{ns.name || ns.id}</div>
                                </div>
                                <div className="opacity-60 text-xs">{isChecked ? "will be included" : "will be ignored"}</div>
                            </button>

                            <div className="pl-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    className="mm-checkbox"
                                    checked={isChecked}
                                    onChange={(e) => { bmStore.setSelected(ns.id, e.target.checked); reportUp(); }}
                                />
                            </div>
                        </div>

                        {isOpen && (
                            <div className="p-3 border-t border-white/10">
                                <BindingWidget
                                    open
                                    projectId={projectId}
                                    serviceId={serviceId}
                                    ns={ns}
                                    initial={initialForWidget}
                                    onSaved={onSavedOne}
                                    onDraftChange={getDraftHandler(ns.id)}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

export default BindingManager;

