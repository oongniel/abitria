export type CurrencyCode = "AED" | "PHP";

const fmtCache = new Map<string, Intl.NumberFormat>();
const nf = (key: string, opts: Intl.NumberFormatOptions) => {
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", opts);
    fmtCache.set(key, f);
  }
  return f;
};

export const money = (value: number, currency: CurrencyCode, opts?: { decimals?: number; signed?: boolean }) => {
  const decimals = opts?.decimals ?? (currency === "PHP" ? 0 : Number.isInteger(value) ? 0 : 2);
  const f = nf(`${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const abs = f.format(Math.abs(value));
  const sign = value < 0 ? "−" : opts?.signed && value > 0 ? "+" : "";
  return `${sign}${currency === "PHP" ? "₱" : "AED "}${abs}`;
};

export const plain = (value: number, decimals = 0) =>
  nf(`p${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

export const percent = (value: number, decimals = 0) =>
  `${nf(`pc${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value * 100)}%`;

export const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const plural = (n: number, one: string, many = `${one}s`) => `${plain(n)} ${n === 1 ? one : many}`;
