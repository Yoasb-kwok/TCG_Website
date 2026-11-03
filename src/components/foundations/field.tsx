"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FoundationFieldProps = Omit<React.ComponentProps<typeof Input>, "variant"> & {
  label: string;
  inputClassName?: string;
};

/** Figma Input 4:63. Label plus a 48px surface field inside the paper-tinted well. */
function FoundationField({
  label,
  id,
  className,
  inputClassName,
  ...props
}: FoundationFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  return (
    <div
      className={cn(
        "flex w-full max-w-[340px] flex-col gap-2 rounded-[10px] border border-trtcg-line bg-trtcg-input-well px-[12px] py-[8px]",
        className,
      )}
    >
      <label
        htmlFor={fieldId}
        className="text-[14px] font-bold leading-[1.45] text-trtcg-ink"
      >
        {label}
      </label>
      <Input
        id={fieldId}
        variant="foundation"
        className={inputClassName}
        {...props}
      />
    </div>
  );
}

export { FoundationField };
export type { FoundationFieldProps };
