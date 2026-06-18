import type { TranslationValues } from "@/i18n";
import {
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_PAGE3_PICKS,
  MIN_TOTAL_PICKS
} from "@/data/markets";

export type PageSaveError =
  | { code: "page1_min"; count: number; min: number }
  | { code: "page2_min"; count: number; min: number }
  | { code: "page3_min"; count: number; min: number }
  | { code: "total_min"; count: number; min: number };

export function translatePageSaveError(
  t: (key: string, values?: TranslationValues) => string,
  error: PageSaveError
) {
  switch (error.code) {
    case "page1_min":
      return t("validation.page1Min", { min: error.min, count: error.count });
    case "page2_min":
      return t("validation.page2Min", { min: error.min, count: error.count });
    case "page3_min":
      return t("validation.page3Min", { min: error.min, count: error.count });
    case "total_min":
      return t("validation.totalMin", { min: error.min, count: error.count });
  }
}

export { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS, MIN_TOTAL_PICKS };
