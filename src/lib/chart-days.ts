/** Rolling window used by staff sales charts. Keep the UI copy in sync. */
export const TREND_DAY_COUNT = 14;

export function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function trendWindow(now = new Date()) {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = startOfLocalDay(now);
  from.setDate(from.getDate() - (TREND_DAY_COUNT - 1));
  return { from, to };
}

export function eachLocalDay(from: Date, to: Date) {
  const days: Date[] = [];
  const cursor = startOfLocalDay(from);
  const end = startOfLocalDay(to).getTime();
  while (cursor.getTime() <= end && days.length < 400) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Short axis label. The first day, and any day the month changes, includes the month. */
export function seriesDayLabel(date: Date, index: number, days: Date[]) {
  const showMonth = index === 0 || date.getMonth() !== days[index - 1].getMonth();
  return showMonth ? `${date.getMonth() + 1}月${date.getDate()}日` : `${date.getDate()}日`;
}

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

export function dayCaption(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY[date.getDay()]}）`;
}
