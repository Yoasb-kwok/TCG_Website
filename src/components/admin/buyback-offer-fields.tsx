"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORM_FIELD_INPUT_CLASS } from "@/lib/search-bar-styles";
import { cn } from "@/lib/utils";

export function BuybackOfferFields({
  buybackPrice,
  targetBuybackQty,
  onBuybackPriceChange,
  onTargetBuybackQtyChange,
}: {
  buybackPrice: string;
  targetBuybackQty: string;
  onBuybackPriceChange: (value: string) => void;
  onTargetBuybackQtyChange: (value: string) => void;
}) {
  const priceId = useId();
  const quantityId = useId();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor={priceId}>回收價（HKD，選填）</Label>
        <Input
          id={priceId}
          inputMode="decimal"
          value={buybackPrice}
          onChange={(event) => onBuybackPriceChange(event.target.value)}
          placeholder="留空代表未設定"
          className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
        />
      </div>
      <div>
        <Label htmlFor={quantityId}>希望回收數量（選填）</Label>
        <Input
          id={quantityId}
          inputMode="numeric"
          value={targetBuybackQty}
          onChange={(event) => onTargetBuybackQtyChange(event.target.value)}
          placeholder="留空代表未設定"
          className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        收卡畫面會顯示這兩個數字。希望回收數量已滿仍可繼續收卡，也不會改今次收取價錢。
      </p>
    </div>
  );
}
