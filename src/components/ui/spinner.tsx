import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "default" | "primary" | "secondary" | "ghost";
}

export const Spinner = ({
    className,
    size = "md",
    variant = "default",
    ...props
}: SpinnerProps) => {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12"
    };

    const variantClasses = {
        default: "text-slate-400",
        primary: "text-primary",
        secondary: "text-secondary",
        ghost: "text-slate-200"
    };

    return (
        <div className={cn("flex items-center justify-center", className)} {...props}>
            <Loader2
                className={cn(
                    "animate-spin",
                    sizeClasses[size],
                    variantClasses[variant]
                )}
            />
        </div>
    );
};
