import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<typeof InputPrimitive> & {
  variant?: "default" | "foundation";
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onValueChange, value, defaultValue, variant = "default", ...props }, ref) => {
    return (
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          variant === "foundation" &&
            "h-[48px] rounded-[12px] border-trtcg-input-border bg-trtcg-surface px-[16px] text-[16px] leading-[1.65] text-trtcg-ink placeholder:text-trtcg-muted md:text-[16px] focus-visible:border-trtcg-gold focus-visible:ring-trtcg-gold/30 dark:bg-trtcg-surface dark:text-trtcg-ink",
          className,
        )}
        onValueChange={onValueChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input }
