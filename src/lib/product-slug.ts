export function slugifyProduct(name: string, suffix: string): string {
  return `${name}-${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
