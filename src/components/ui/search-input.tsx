import * as React from "react";
import { Input } from "@/components/ui/input";
import { SEARCH_BAR_INPUT_CLASS } from "@/lib/search-bar-styles";
import { cn } from "@/lib/utils";

const SearchInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function SearchInput({ className, ...props }, ref) {
  return (
    <Input
      ref={ref}
      className={cn(SEARCH_BAR_INPUT_CLASS, className)}
      {...props}
    />
  );
});

export { SearchInput };
