import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface HeaderActionButtonProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof buttonVariants> {
    disabled?: boolean
}

// Button-styled <span> for actions rendered inside an AccordionTrigger (or any
// other native <button>), where a real <button> is invalid DOM nesting.
const HeaderActionButton = React.forwardRef<HTMLSpanElement, HeaderActionButtonProps>(
    ({ className, variant, size, disabled, onClick, onKeyDown, ...props }, ref) => (
        <span
            ref={ref}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            onKeyDown={(e) => {
                onKeyDown?.(e)
                if (disabled) return
                if (e.key === "Enter" || e.key === " ") {
                    // Don't let the keypress bubble up and toggle the accordion
                    e.preventDefault()
                    e.stopPropagation()
                    onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>)
                }
            }}
            className={cn(
                buttonVariants({ variant, size }),
                "cursor-pointer select-none",
                disabled && "pointer-events-none opacity-50",
                className
            )}
            {...props}
        />
    )
)
HeaderActionButton.displayName = "HeaderActionButton"

export { HeaderActionButton }
