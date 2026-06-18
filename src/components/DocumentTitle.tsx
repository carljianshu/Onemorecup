"use client";

import { useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";

export function DocumentTitle() {
  const { t } = useLocale();

  useEffect(() => {
    document.title = t("meta.title");
  }, [t]);

  return null;
}
