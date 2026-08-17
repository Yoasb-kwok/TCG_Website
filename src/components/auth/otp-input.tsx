"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  onChange,
  disabled = false,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigits(newDigits: string[]) {
    setDigits(newDigits);
    onChange(newDigits.join(""));
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    updateDigits(newDigits);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    const newDigits = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    updateDigits(newDigits);

    const nextIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoFocus={index === 0}
          className={cn(
            "h-12 w-10 rounded-lg border border-border bg-background text-center text-xl font-semibold text-foreground",
            "focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500",
            "disabled:opacity-50 sm:h-14 sm:w-12",
          )}
        />
      ))}
    </div>
  );
}
