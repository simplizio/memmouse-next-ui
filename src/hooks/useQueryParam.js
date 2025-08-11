"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function useQueryParam(key, defaultValue = "") {
    const router = useRouter();
    const params = useSearchParams();
    const value = params.get(key) ?? defaultValue ?? "";

    function setValue(v, options = { replace: true }) {
        const sp = new URLSearchParams(params.toString());
        if (v == null || v === "") sp.delete(key);
        else sp.set(key, v);
        const url = `${window.location.pathname}?${sp.toString()}`;
        options.replace ? router.replace(url, { scroll: false }) : router.push(url);
    }

    return [value, setValue];
}