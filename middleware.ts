import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectLocaleFromRequestHeaders, isLocale, LOCALE_COOKIE, LOCALE_MANUAL_COOKIE } from "@/lib/locale-detect";
import { detectTimezoneFromRequestHeaders, TIMEZONE_INFERRED_COOKIE } from "@/lib/timezone";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    if (!request.cookies.get(TIMEZONE_INFERRED_COOKIE)?.value) {
        const inferredTimezone = detectTimezoneFromRequestHeaders(request.headers);
        if (inferredTimezone) {
            response.cookies.set(TIMEZONE_INFERRED_COOKIE, inferredTimezone, {
                path: "/",
                maxAge: ONE_YEAR_SECONDS,
                sameSite: "lax"
            });
        }
    }
    if (request.cookies.get(LOCALE_MANUAL_COOKIE)?.value === "1") {
        return response;
    }
    const existing = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(existing)) {
        return response;
    }
    const locale = detectLocaleFromRequestHeaders(request.headers);
    response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax"
    });
    return response;
}
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
