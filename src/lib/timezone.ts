import type { Locale } from "@/i18n";
import { readCountryHeader } from "@/lib/locale-detect";
export const TIMEZONE_INFERRED_COOKIE = "onemorecup:tz-inferred";
const COUNTRY_TIMEZONE: Record<string, string> = {
    CN: "Asia/Shanghai",
    HK: "Asia/Hong_Kong",
    MO: "Asia/Macau",
    TW: "Asia/Taipei",
    JP: "Asia/Tokyo",
    KR: "Asia/Seoul",
    SG: "Asia/Singapore",
    MY: "Asia/Kuala_Lumpur",
    TH: "Asia/Bangkok",
    VN: "Asia/Ho_Chi_Minh",
    IN: "Asia/Kolkata",
    ID: "Asia/Jakarta",
    PH: "Asia/Manila",
    AU: "Australia/Sydney",
    NZ: "Pacific/Auckland",
    GB: "Europe/London",
    IE: "Europe/Dublin",
    FR: "Europe/Paris",
    DE: "Europe/Berlin",
    IT: "Europe/Rome",
    ES: "Europe/Madrid",
    PT: "Europe/Lisbon",
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    CH: "Europe/Zurich",
    AT: "Europe/Vienna",
    SE: "Europe/Stockholm",
    NO: "Europe/Oslo",
    DK: "Europe/Copenhagen",
    FI: "Europe/Helsinki",
    PL: "Europe/Warsaw",
    CZ: "Europe/Prague",
    RU: "Europe/Moscow",
    UA: "Europe/Kyiv",
    TR: "Europe/Istanbul",
    US: "America/New_York",
    CA: "America/Toronto",
    MX: "America/Mexico_City",
    BR: "America/Sao_Paulo",
    AR: "America/Argentina/Buenos_Aires",
    CL: "America/Santiago",
    CO: "America/Bogota",
    ZA: "Africa/Johannesburg",
    EG: "Africa/Cairo",
    AE: "Asia/Dubai",
    SA: "Asia/Riyadh",
    IL: "Asia/Jerusalem"
};
export function timezoneFromCountryCode(country: string | null | undefined): string | null {
    if (!country)
        return null;
    const code = country.trim().toUpperCase();
    if (!code || code === "XX" || code === "T1")
        return null;
    return COUNTRY_TIMEZONE[code] ?? null;
}
export function detectTimezoneFromRequestHeaders(headers: Headers): string | null {
    return timezoneFromCountryCode(readCountryHeader(headers));
}
export function readBrowserTimezone(): string | null {
    if (typeof Intl === "undefined")
        return null;
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return tz || null;
    }
    catch {
        return null;
    }
}
export function resolveDisplayTimezone(ipInferredTimezone: string | null | undefined): string {
    return readBrowserTimezone() ?? ipInferredTimezone ?? "UTC";
}
function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? "";
}
export function formatDeadlineDisplay(iso: string | null, locale: Locale, timeZone: string): string | null {
    if (!iso)
        return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return null;
    if (timeZone === "UTC") {
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");
        const time = `${hours}:${minutes}`;
        if (locale === "zh") {
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            return `${month}月${day}日${time}(UTC)`;
        }
        const datePart = new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            timeZone: "UTC"
        }).format(date);
        return `${datePart}, ${time} (UTC)`;
    }
    const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        timeZone,
        month: locale === "zh" ? "numeric" : "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short"
    });
    const parts = formatter.formatToParts(date);
    const month = partValue(parts, "month");
    const day = partValue(parts, "day");
    const hour = partValue(parts, "hour").replace(/^0+/, "") || "0";
    const minute = partValue(parts, "minute");
    const tzName = partValue(parts, "timeZoneName");
    if (locale === "zh") {
        return `${month}月${day}日${hour}:${minute}（${tzName}）`;
    }
    return `${month} ${day}, ${hour}:${minute} (${tzName})`;
}
