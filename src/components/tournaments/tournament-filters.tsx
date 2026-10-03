"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  type TournamentFilterState,
  DEFAULT_FILTERS,
} from "@/lib/tournament-filters";
import { statusLabel } from "@/lib/tournament-ui";

interface TournamentFiltersProps {
  filters: TournamentFilterState;
  onChange: (filters: TournamentFilterState) => void;
  /** Status options — pass different sets for public vs admin. */
  statuses: string[];
}

export function TournamentFilters({
  filters,
  onChange,
  statuses,
}: TournamentFiltersProps) {
  const update = <K extends keyof TournamentFilterState>(
    key: K,
    value: TournamentFilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-2">
      {/* Search row */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder="搜尋賽事名稱…"
          className="border-border bg-input pl-9 dark:bg-input/30"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => update("search", "")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="清除搜尋"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Format — type to filter */}
        <div className="relative">
          <Input
            value={filters.format}
            onChange={(e) => update("format", e.target.value)}
            placeholder="搜尋賽制…"
            className="h-7 w-28 border-border bg-input px-2 text-sm dark:bg-input/30"
          />
          {filters.format && (
            <button
              type="button"
              onClick={() => update("format", "")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清除賽制"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <FilterSelect
          value={filters.status}
          onChange={(v) => update("status", v)}
          placeholder="狀態"
          options={statuses}
          labelFn={(s) => statusLabel(s)}
        />
        <FilterSelect
          value={filters.feeType}
          onChange={(v) =>
            update("feeType", v as TournamentFilterState["feeType"])
          }
          placeholder="報名費"
          options={["all", "free", "paid"]}
          labelFn={(v) =>
            v === "all" ? "報名費：全部" : v === "free" ? "免費" : "付費"
          }
        />
        <FilterSelect
          value={filters.prizeType}
          onChange={(v) =>
            update("prizeType", v as TournamentFilterState["prizeType"])
          }
          placeholder="獎品"
          options={["all", "has", "none"]}
          labelFn={(v) =>
            v === "all" ? "獎品：全部" : v === "has" ? "有獎品" : "無獎品"
          }
        />
        <FilterSelect
          value={filters.sort}
          onChange={(v) => update("sort", v as TournamentFilterState["sort"])}
          placeholder="排序"
          options={["nearest", "earliest", "latest"]}
          labelFn={(v) =>
            v === "nearest" ? "最近" : v === "earliest" ? "最早" : "最晚"
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onChange({ ...DEFAULT_FILTERS })}
        >
          清除
        </Button>
      </div>
    </div>
  );
}

/** Thin wrapper around base-ui Select for a single filter dimension. */
function FilterSelect<T extends string>({
  value,
  onChange,
  placeholder,
  options,
  labelFn,
}: {
  value: string;
  onChange: (v: T) => void;
  placeholder: string;
  options: T[];
  labelFn: (v: T) => string;
}) {
  // Build {value, label} pairs so base-ui resolves the Chinese label for
  // the trigger display (otherwise it shows the raw value like "free").
  const items = options.map((opt) => ({ value: opt, label: labelFn(opt) }));

  return (
    <Select
      value={(value || null) as T | null}
      onValueChange={(v) => onChange((v as T) ?? ("" as T))}
      items={items}
    >
      <SelectTrigger
        size="sm"
        className="border-border bg-input dark:bg-input/30"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="max-h-72"
        alignItemWithTrigger={false}
        collisionAvoidance={{ side: "shift", fallbackAxisSide: "none" }}
      >
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labelFn(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
