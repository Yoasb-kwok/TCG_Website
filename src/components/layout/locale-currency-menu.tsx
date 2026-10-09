"use client";

import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCY, LOCALE } from "@/lib/constants";

const LOCALE_BUTTON: Record<string, string> = {
  "zh-HK": "繁",
};

const LOCALE_MENU: Record<string, string> = {
  "zh-HK": "繁體中文",
};

/**
 * Prices and interface copy are HKD + Traditional Chinese only.
 * The menu shows that selection instead of leaving the header control inert.
 */
export function LocaleCurrencyMenu() {
  const buttonLocale = LOCALE_BUTTON[LOCALE] ?? LOCALE;
  const menuLocale = LOCALE_MENU[LOCALE] ?? LOCALE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hidden items-center gap-1 rounded-md px-2 py-1 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
        aria-label={`貨幣與語言，目前為${CURRENCY}及${menuLocale}`}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {CURRENCY} | {buttonLocale}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 min-w-64">
        <DropdownMenuLabel>貨幣</DropdownMenuLabel>
        <DropdownMenuRadioGroup defaultValue={CURRENCY} aria-label="貨幣">
          <DropdownMenuRadioItem value={CURRENCY}>港幣 (HKD)</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <p className="px-1.5 py-1 text-xs text-muted-foreground">目前只以港幣結算</p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>語言</DropdownMenuLabel>
        <DropdownMenuRadioGroup defaultValue={LOCALE} aria-label="語言">
          <DropdownMenuRadioItem value={LOCALE}>{menuLocale}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <p className="px-1.5 pb-1.5 text-xs text-muted-foreground">
          English 與簡體中文暫不提供
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
