import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

const foundationVariant = {
  primary: "primary",
  secondary: "foundation-secondary",
  quiet: "quiet",
  disabled: "disabled",
} as const;

type FoundationButtonVariant = keyof typeof foundationVariant;

type FoundationButtonProps = Omit<ComponentProps<typeof Button>, "variant"> & {
  variant?: FoundationButtonVariant;
};

/** Figma Button 4:62. Maps Secondary onto `foundation-secondary` so shadcn `secondary` stays put. */
function FoundationButton({ variant = "primary", ...props }: FoundationButtonProps) {
  return (
    <Button
      data-foundation-variant={variant}
      variant={foundationVariant[variant]}
      {...props}
    />
  );
}

export { FoundationButton, foundationVariant };
export type { FoundationButtonProps, FoundationButtonVariant };
