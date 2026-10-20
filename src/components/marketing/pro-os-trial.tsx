"use client";

import { useState } from "react";
import { ChevronDown, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { proCtaClass } from "@/components/marketing/pro-os-ui";

const FAQS = [
  {
    q: "門市收銀需要額外購買專用的 POS 機或硬體嗎？",
    a: "不需要！系統完全支援瀏覽器運作，您現有的 iPad、Mac、Windows 電腦，甚至智慧型手機均可直接開啟後台操作。條碼槍只需 USB 或藍芽連接即可使用。",
  },
  {
    q: "顧客使用 PayMe 或 FPS 轉數快付款，系統如何處理？",
    a: "網店結帳與門市 POS 都可選 PayMe 或 FPS 轉數快。顧客完成轉帳後，系統把該筆訂單標成已付款，並即時扣減門市與網店庫存，店員不用再人手改數。",
  },
  {
    q: "顧客寄賣（Consignment）的單卡佣金如何計算？",
    a: "每張寄賣卡可設定店鋪抽成。售出當下系統自動扣除佣金、記入寄賣賣家，月底一鍵匯出 Excel 分帳表，不用逐張對單。",
  },
  {
    q: "如果我想擴充其他卡牌遊戲（如航海王、符文戰場），方便嗎？",
    a: "方便。系統原生支援 PTCG，亦可一鍵擴充航海王、符文戰場、遊戲王、MTG 等卡牌資料庫，分類、庫存、POS 收銀沿用同一套流程。",
  },
] as const;

type FormState = {
  shop: string;
  whatsapp: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { shop: "", whatsapp: "", email: "" };

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!values.shop.trim()) errors.shop = "請填寫卡牌店 / 網店名稱";
  const digits = values.whatsapp.replace(/\D/g, "");
  if (!values.whatsapp.trim()) errors.whatsapp = "請填寫 WhatsApp 聯絡電話";
  else if (digits.length < 8) errors.whatsapp = "請輸入有效的 WhatsApp 號碼";
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "電郵格式不正確";
  }
  return errors;
}

export function ProOsFaqTrial() {
  const [open, setOpen] = useState<number | null>(0);
  const [values, setValues] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedShop, setSubmittedShop] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmittedShop(values.shop.trim());
  };

  return (
    <section id="faq" className="scroll-mt-24 py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">常見問題 FAQ</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((item, index) => {
              const expanded = open === index;
              return (
                <div key={item.q} className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1526]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : index)}
                  >
                    <span className={cn("text-sm font-medium sm:text-base", expanded ? "text-cyan-300" : "text-slate-100")}>
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-slate-400 transition", expanded && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  {expanded ? <p className="px-4 pb-4 text-sm leading-7 text-slate-400">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div
          id="trial"
          className="scroll-mt-24 rounded-[28px] border border-cyan-400/30 bg-[#0c1628] p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-7"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            <Sparkles className="size-3.5" aria-hidden="true" />
            即刻升級您的卡牌店
          </p>
          <h2 className="mt-4 text-2xl font-bold text-white">免費開通 30 天試用</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">無需輸入信用卡，專人 WhatsApp 快速聯絡並協助開通</p>

          {submittedShop ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5" role="status">
              <p className="text-base font-semibold text-emerald-200">已收到試用申請</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                我們會透過 WhatsApp 聯絡「{submittedShop}」，協助開通 30 天試用。無需信用卡。
              </p>
              <button
                type="button"
                className="mt-4 text-sm font-medium text-cyan-300 hover:text-cyan-200"
                onClick={() => {
                  setSubmittedShop(null);
                  setValues(EMPTY);
                  setErrors({});
                }}
              >
                再填一張
              </button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <Field
                id="trial-shop"
                label="卡牌店 / 網店名稱"
                required
                placeholder="例如: 旺角 TCG Card Center"
                value={values.shop}
                error={errors.shop}
                autoComplete="organization"
                onChange={(shop) => setValues((current) => ({ ...current, shop }))}
              />
              <Field
                id="trial-whatsapp"
                label="WhatsApp 聯絡電話"
                required
                placeholder="例如: 9123 4567"
                value={values.whatsapp}
                error={errors.whatsapp}
                autoComplete="tel"
                inputMode="tel"
                onChange={(whatsapp) => setValues((current) => ({ ...current, whatsapp }))}
              />
              <Field
                id="trial-email"
                label="電郵地址 (選填)"
                placeholder="shop@example.com"
                value={values.email}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                onChange={(email) => setValues((current) => ({ ...current, email }))}
              />
              <button type="submit" className={cn(proCtaClass, "mt-2 w-full py-3 text-base")}>
                <Sparkles className="size-4" aria-hidden="true" />
                提交：免費試用 30 天（無需信用卡）
              </button>
            </form>
          )}

          <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-[11px] leading-5 text-slate-500">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            我們重視您的資料隱私，承諾不會發送任何垃圾訊息。
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  placeholder,
  value,
  error,
  autoComplete,
  inputMode,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  error?: string;
  autoComplete: string;
  inputMode?: "tel" | "email";
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-slate-200">
        {label}
        {required ? <span className="text-cyan-300"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#09111e] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
