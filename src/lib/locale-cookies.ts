import {
  LOCALE_COOKIE,
  LOCALE_MANUAL_COOKIE,
  resolveLocaleFromCookieValue
} from "@/lib/locale-detect";
import type { Locale } from "@/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readServerLocale(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): Locale {
  return resolveLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
}

export function writeLocaleCookies(locale: Locale, manual: boolean) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? ";secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax${secure}`;
  if (manual) {
    document.cookie = `${LOCALE_MANUAL_COOKIE}=1;path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax${secure}`;
  }
}

export { LOCALE_COOKIE, LOCALE_MANUAL_COOKIE };
