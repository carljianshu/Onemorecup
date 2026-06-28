import { TIMEZONE_INFERRED_COOKIE } from "@/lib/timezone";
export function readServerInferredTimezone(cookieStore: {
    get: (name: string) => {
        value: string;
    } | undefined;
}): string | null {
    const value = cookieStore.get(TIMEZONE_INFERRED_COOKIE)?.value;
    if (!value)
        return null;
    return value;
}
export { TIMEZONE_INFERRED_COOKIE };
