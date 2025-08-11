import { cn } from "@/lib/utils/cn";

export function Button({ variant = "default", className, ...props }) {
    const base = "mm-btn text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20";
    const variants = {
        default: "mm-btn-primary",
        ghost: "mm-btn-ghost",
        glass: "mm-btn-primary",
    };
    return <button className={cn(base, variants[variant], className)} {...props} />;
}