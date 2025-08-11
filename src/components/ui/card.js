import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }) {
    return <div className={cn("mm-glass rounded-2xl", className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
    return <div className={cn("p-4 border-b border-white/10", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
    return <div className={cn("p-4", className)} {...props} />;
}
export function CardFooter({ className, ...props }) {
    return <div className={cn("p-4 border-t border-white/10", className)} {...props} />;
}