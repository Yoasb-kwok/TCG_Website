"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDuration, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORE } from "@/lib/constants";
import { allowedTransitions } from "@/lib/tournament-status";
import { statusBadgeClass, statusLabel } from "@/lib/tournament-ui";
import { Badge } from "@/components/ui/badge";
import { DayPicker } from "react-day-picker";
import { zhTW } from "date-fns/locale";
import "react-day-picker/style.css";

/** Full day, 15-minute steps: 00:00 → 23:45. Value is 24-hour "HH:MM" (matches new Date(`${date}T${time}`)). */
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const period = h < 12 ? "上午" : h < 18 ? "下午" : "晚上";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${period} ${h12}:${String(min).padStart(2, "0")} (${value})`;
    options.push({ value, label });
  }
  return options;
})();

/** 比賽時長選項：30 分鐘為一級，最長 24 小時。 */
const DURATION_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let mins = 30; mins <= 24 * 60; mins += 30) {
    options.push({ value: String(mins), label: formatDuration(mins) });
  }
  return options;
})();

/** 管理員可手動設定的賽事狀態。 */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "OPEN", label: statusLabel("OPEN") },
  { value: "FULL", label: statusLabel("FULL") },
  { value: "IN_PROGRESS", label: statusLabel("IN_PROGRESS") },
  { value: "COMPLETED", label: statusLabel("COMPLETED") },
  { value: "CANCELLED", label: statusLabel("CANCELLED") },
];

/** Normal operating window (store hours: 12:00 noon – 10:00 PM). Times outside this are allowed but flagged with a warning. */
const OPENS_MIN = 12 * 60; // 12:00 PM (noon)
const CLOSES_MIN = 22 * 60; // 10:00 PM

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Split a stored UTC instant into the viewer's local YYYY-MM-DD for <input type=date>. */
function toLocalDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Split a stored UTC instant into the viewer's local HH:MM for the time field. */
function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isOutsideHours(t: string): boolean {
  const [h, m] = t.split(":").map(Number);
  const min = h * 60 + m;
  return min < OPENS_MIN || min > CLOSES_MIN;
}

interface Registration {
  id: string;
  playerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

interface Tournament {
  id: string;
  title: string;
  format: string;
  maxPlayers: number;
  entryFee: number;
  location: string;
  startsAt: string;
  registrationDeadline: string;
  durationMinutes: number;
  status: string;
  _count: { registrations: number };
  registrations: Registration[];
}

/** Combined time picker: a mouse dropdown (15-min slots) + a keyboard "HH:MM" field,
 * both bound to the same value. Illegal characters are stripped on input; a bad
 * format or out-of-hours value shows an inline warning. */
function TimeField({
  label,
  value,
  onChange,
  showHoursWarning = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  showHoursWarning?: boolean;
}) {
  const legal = value === "" || isValidTime(value);
  const outside =
    showHoursWarning &&
    value !== "" &&
    isValidTime(value) &&
    isOutsideHours(value);
  const onList = TIME_OPTIONS.some((t) => t.value === value);

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex gap-2">
        <Select
          value={onList ? value : null}
          onValueChange={(v) => onChange((v as string) ?? "")}
          items={TIME_OPTIONS}
        >
          <SelectTrigger className="flex-1 border-border bg-input dark:bg-input/30">
            <SelectValue placeholder="請選擇時間" />
          </SelectTrigger>
          <SelectContent
            className="max-h-72"
            alignItemWithTrigger={false}
            collisionAvoidance={{ side: "shift", fallbackAxisSide: "none" }}
          >
            {TIME_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          required
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^\d:]/g, "").slice(0, 5))
          }
          placeholder="HH:MM"
          inputMode="numeric"
          className="w-24 border-border bg-input text-foreground"
        />
      </div>
      {!legal && (
        <p className="mt-1 text-xs text-destructive">
          時間格式不正確，請輸入 HH:MM（00:00–23:45）
        </p>
      )}
      {outside && (
        <p className="mt-1 text-xs text-amber-500">
          ⚠ 此時間不在一般營業時段（中午 12:00 – 晚上 10:00）內，請確認
        </p>
      )}
    </div>
  );
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>();
  const [deadlineEdit, setDeadlineEdit] = useState({ date: "", time: "" });
  const [batchForm, setBatchForm] = useState({
    title: "",
    format: "Standard",
    maxPlayers: "32",
    entryFee: "80",
    location: "門市",
    startTime: "",
    durationMinutes: "120",
    daysBeforeDeadline: "3",
    prizePool: "",
    description: "",
  });
  const [form, setForm] = useState({
    title: "",
    format: "Standard",
    maxPlayers: "32",
    entryFee: "80",
    location: "門市",
    startsAtDate: "",
    startsAtTime: "",
    registrationDeadlineDate: "",
    registrationDeadlineTime: "",
    durationMinutes: "120",
    prizePool: "",
  });

  const load = async () => {
    const res = await fetch("/api/admin/tournaments");
    const data = (await res.json()) as { tournaments: Tournament[] };
    setTournaments(data.tournaments ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      startsAtDate,
      startsAtTime,
      registrationDeadlineDate,
      registrationDeadlineTime,
      ...rest
    } = form;
    if (!isValidTime(startsAtTime) || !isValidTime(registrationDeadlineTime)) {
      alert("請輸入正確的時間格式（HH:MM，例如 14:30）");
      return;
    }
    // The registration deadline must not be later than the tournament start.
    if (
      new Date(
        `${registrationDeadlineDate}T${registrationDeadlineTime}`,
      ).getTime() > new Date(`${startsAtDate}T${startsAtTime}`).getTime()
    ) {
      alert("報名截止時間不能晚於比賽開始時間");
      return;
    }
    // Combine the local date + time into an ISO string on the client. Converting
    // here (via new Date().toISOString()) pins the admin's intended local time to a
    // precise instant, so a UTC production server stores the correct value.
    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rest,
        startsAt: new Date(`${startsAtDate}T${startsAtTime}`).toISOString(),
        registrationDeadline: new Date(
          `${registrationDeadlineDate}T${registrationDeadlineTime}`,
        ).toISOString(),
        maxPlayers: Number(form.maxPlayers),
        entryFee: Number(form.entryFee),
        durationMinutes: Number(form.durationMinutes),
      }),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      // Surface the server's friendly message (validation error, DB down,
      // etc.). Falls back to a generic notice if the body isn't JSON.
      let message = "建立賽事失敗，請重試";
      try {
        const data = await res.json();
        if (typeof data?.error === "string" && data.error) {
          message = data.error;
        }
      } catch {
        // response wasn't JSON; keep the default message
      }
      alert(message);
    }
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.startTime || !isValidTime(batchForm.startTime)) {
      alert("請輸入正確的比賽時間（HH:MM）");
      return;
    }
    if (!selectedDates || selectedDates.length === 0) {
      alert("請至少選擇一個比賽日期");
      return;
    }
    // Sort + format selected dates as YYYY-MM-DD for the API.
    const dates = [...selectedDates]
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      });

    const res = await fetch("/api/admin/tournaments/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: batchForm.title,
        description: batchForm.description,
        format: batchForm.format,
        location: batchForm.location,
        prizePool: batchForm.prizePool,
        startTime: batchForm.startTime,
        dates,
        maxPlayers: Number(batchForm.maxPlayers),
        entryFee: Number(batchForm.entryFee),
        durationMinutes: Number(batchForm.durationMinutes),
        daysBeforeDeadline: Number(batchForm.daysBeforeDeadline),
      }),
    });
    if (res.ok) {
      setShowBatchForm(false);
      setSelectedDates(undefined);
      setBatchForm({
        title: "",
        format: "Standard",
        maxPlayers: "32",
        entryFee: "80",
        location: "門市",
        startTime: "",
        durationMinutes: "120",
        daysBeforeDeadline: "3",
        prizePool: "",
        description: "",
      });
      load();
    } else {
      let message = "批次建立賽事失敗，請重試";
      try {
        const data = await res.json();
        if (typeof data?.error === "string" && data.error) {
          message = data.error;
        }
      } catch {
        // response wasn't JSON
      }
      alert(message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const updateDeadline = async (id: string, startsAt: string) => {
    if (!isValidTime(deadlineEdit.time)) {
      alert("請輸入正確的時間格式（HH:MM，例如 14:30）");
      return;
    }
    if (!deadlineEdit.date) {
      alert("請選擇截止日期");
      return;
    }
    const newDeadline = new Date(`${deadlineEdit.date}T${deadlineEdit.time}`);
    // The registration deadline must not be later than the tournament start.
    if (newDeadline.getTime() > new Date(startsAt).getTime()) {
      alert("報名截止時間不能晚於比賽開始時間");
      return;
    }
    const iso = newDeadline.toISOString();
    const res = await fetch(`/api/admin/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationDeadline: iso }),
    });
    if (res.ok) {
      load();
    } else {
      // Surface the server's friendly message (validation error, DB down,
      // etc.). Falls back to a generic notice if the body isn't JSON.
      let message = "更新截止時間失敗，請重試";
      try {
        const data = await res.json();
        if (typeof data?.error === "string" && data.error) {
          message = data.error;
        }
      } catch {
        // response wasn't JSON; keep the default message
      }
      alert(message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店賽報名</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            賽事管理及報名名單
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setShowBatchForm(false);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {showForm ? "取消" : "新增賽事"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowBatchForm(!showBatchForm);
              setShowForm(false);
            }}
          >
            {showBatchForm ? "取消" : "批次建立賽事"}
          </Button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={createTournament}
          className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label>賽事名稱</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>賽制</Label>
            <Input
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>名額</Label>
            <Input
              type="number"
              value={form.maxPlayers}
              onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>報名費 (HKD)</Label>
            <Input
              type="number"
              value={form.entryFee}
              onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>地點</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>比賽日期</Label>
            <Input
              type="date"
              required
              value={form.startsAtDate}
              onChange={(e) =>
                setForm({ ...form, startsAtDate: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <TimeField
            label="比賽時間"
            value={form.startsAtTime}
            onChange={(v) => setForm({ ...form, startsAtTime: v })}
          />
          <div>
            <Label>預計時長</Label>
            <Select
              value={form.durationMinutes}
              onValueChange={(v) =>
                setForm({ ...form, durationMinutes: (v as string) ?? "120" })
              }
              items={DURATION_OPTIONS}
            >
              <SelectTrigger className="mt-1 w-full border-border bg-input dark:bg-input/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>報名截止日期</Label>
            <Input
              type="date"
              required
              value={form.registrationDeadlineDate}
              onChange={(e) =>
                setForm({ ...form, registrationDeadlineDate: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <TimeField
            label="報名截止時間"
            value={form.registrationDeadlineTime}
            onChange={(v) => setForm({ ...form, registrationDeadlineTime: v })}
            showHoursWarning={false}
          />
          <div className="sm:col-span-2">
            <Label>獎品（選填）</Label>
            <Input
              value={form.prizePool}
              onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <Button
            type="submit"
            className="sm:col-span-2 bg-primary text-primary-foreground"
          >
            建立賽事
          </Button>
        </form>
      )}

      {showBatchForm && (
        <form
          onSubmit={createBatch}
          className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold text-foreground">
              批次建立賽事
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              填寫共用資料，選擇多個日期，一次建立多場賽事。
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label>賽事名稱</Label>
            <Input
              required
              value={batchForm.title}
              onChange={(e) =>
                setBatchForm({ ...batchForm, title: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              每場將自動加上編號（#1、#2…）
            </p>
          </div>

          <div>
            <Label>賽制</Label>
            <Input
              value={batchForm.format}
              onChange={(e) =>
                setBatchForm({ ...batchForm, format: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>名額</Label>
            <Input
              type="number"
              value={batchForm.maxPlayers}
              onChange={(e) =>
                setBatchForm({ ...batchForm, maxPlayers: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>報名費 (HKD)</Label>
            <Input
              type="number"
              value={batchForm.entryFee}
              onChange={(e) =>
                setBatchForm({ ...batchForm, entryFee: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div>
            <Label>地點</Label>
            <Input
              value={batchForm.location}
              onChange={(e) =>
                setBatchForm({ ...batchForm, location: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>

          <TimeField
            label="比賽時間"
            value={batchForm.startTime}
            onChange={(v) => setBatchForm({ ...batchForm, startTime: v })}
          />

          <div>
            <Label>預計時長</Label>
            <Select
              value={batchForm.durationMinutes}
              onValueChange={(v) =>
                setBatchForm({
                  ...batchForm,
                  durationMinutes: (v as string) ?? "120",
                })
              }
              items={DURATION_OPTIONS}
            >
              <SelectTrigger className="mt-1 w-full border-border bg-input dark:bg-input/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="max-h-72"
                alignItemWithTrigger={false}
                collisionAvoidance={{
                  side: "shift",
                  fallbackAxisSide: "none",
                }}
              >
                {DURATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>報名截止前（天數）</Label>
            <Input
              type="number"
              min="0"
              required
              value={batchForm.daysBeforeDeadline}
              onChange={(e) =>
                setBatchForm({
                  ...batchForm,
                  daysBeforeDeadline: e.target.value,
                })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              報名截止時間 = 比賽時間 − 此天數
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label>獎品（選填）</Label>
            <Input
              value={batchForm.prizePool}
              onChange={(e) =>
                setBatchForm({ ...batchForm, prizePool: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>描述（選填）</Label>
            <Input
              value={batchForm.description}
              onChange={(e) =>
                setBatchForm({ ...batchForm, description: e.target.value })
              }
              className="mt-1 border-border bg-input text-foreground"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>選擇比賽日期（可多選）</Label>
            <div className="mt-2 flex flex-wrap justify-start rounded-lg border border-border bg-background p-4">
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={setSelectedDates}
                locale={zhTW}
                disabled={{ before: new Date() }}
              />
            </div>
            {selectedDates && selectedDates.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                已選 {selectedDates.length} 個日期，將建立{" "}
                {selectedDates.length} 場賽事
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="sm:col-span-2 bg-primary text-primary-foreground"
          >
            批次建立 {selectedDates?.length ?? 0} 場賽事
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {tournaments.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => {
                if (expanded === t.id) {
                  setExpanded(null);
                } else {
                  setExpanded(t.id);
                  setDeadlineEdit({
                    date: toLocalDateInput(t.registrationDeadline),
                    time: toLocalTimeInput(t.registrationDeadline),
                  });
                }
              }}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <Badge
                    variant="secondary"
                    className={statusBadgeClass(t.status)}
                  >
                    {statusLabel(t.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(t.startsAt)} · {t.location} · {t.format}
                  {t.durationMinutes
                    ? ` · ${formatDuration(t.durationMinutes)}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-pink-400">
                  {t._count.registrations} / {t.maxPlayers} 人
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {t.entryFee > 0 ? formatPrice(t.entryFee) : "免費"}
                </p>
              </div>
            </button>

            {expanded === t.id && (
              <div className="border-t border-border px-5 pb-5">
                <div className="flex items-center gap-3 py-4">
                  <span className="text-sm text-muted-foreground">
                    賽事狀態
                  </span>
                  <select
                    value={t.status}
                    disabled={allowedTransitions(t.status).length <= 1}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="rounded-lg border border-border bg-input px-2.5 py-1 text-sm text-foreground transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  >
                    {STATUS_OPTIONS.filter((s) =>
                      allowedTransitions(t.status).includes(s.value),
                    ).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-end gap-3 border-t border-border py-4">
                  <div>
                    <Label className="text-muted-foreground">
                      報名截止日期
                    </Label>
                    <Input
                      type="date"
                      value={deadlineEdit.date}
                      onChange={(e) =>
                        setDeadlineEdit({
                          ...deadlineEdit,
                          date: e.target.value,
                        })
                      }
                      className="mt-1 border-border bg-input text-foreground"
                    />
                  </div>
                  <TimeField
                    label="報名截止時間"
                    value={deadlineEdit.time}
                    onChange={(v) =>
                      setDeadlineEdit({ ...deadlineEdit, time: v })
                    }
                    showHoursWarning={false}
                  />
                  <Button
                    type="button"
                    onClick={() => updateDeadline(t.id, t.startsAt)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    更新截止時間
                  </Button>
                  {new Date(t.registrationDeadline) < new Date() && (
                    <span className="text-xs text-amber-500">
                      目前已過截止時間
                    </span>
                  )}
                </div>
                {t.registrations.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground/80">
                    暫無報名
                  </p>
                ) : (
                  <table className="mt-4 w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="pb-2">選手</th>
                        <th className="pb-2">電郵</th>
                        <th className="pb-2">電話</th>
                        <th className="pb-2">報名時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.registrations.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="py-2 text-foreground">
                            {r.playerName}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {r.email}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {r.phone ?? "—"}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {formatDate(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {tournaments.length === 0 && (
          <p className="py-12 text-center text-muted-foreground/80">
            尚無賽事，點擊「新增賽事」建立
          </p>
        )}
      </div>
    </div>
  );
}
