import type { Locale } from "@/i18n";

export const LOCALE_COOKIE = "onemorecup:locale";
export const LOCALE_MANUAL_COOKIE = "onemorecup:locale-manual";

/** 使用中文界面的国家/地区（ISO 3166-1 alpha-2）。 */
const CHINESE_REGIONS = new Set(["CN", "HK", "MO", "TW"]);

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en";
}

export function localeFromCountryCode(country: string | null | undefined): Locale {
  if (!country) return "zh";
  const code = country.trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return "zh";
  return CHINESE_REGIONS.has(code) ? "zh" : "en";
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "zh";
  const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary.startsWith("zh")) return "zh";
  return "en";
}

function readCountryHeader(headers: Headers): string | null {
  return (
    headers.get("x-nf-country") ||
    headers.get("x-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country")
  );
}

/** 根据 CDN / 平台注入的 IP 地理头或 Accept-Language 推断语言。 */
export function detectLocaleFromRequestHeaders(headers: Headers): Locale {
  const country = readCountryHeader(headers);
  if (country) return localeFromCountryCode(country);
  return localeFromAcceptLanguage(headers.get("accept-language"));
}

export function resolveLocaleFromCookieValue(value: string | null | undefined): Locale {
  return isLocale(value) ? value : "zh";
}
