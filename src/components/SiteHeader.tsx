"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/context/LocaleContext";

export function SiteHeader() {
  const { t } = useLocale();

  return (
    <header className="site-header">
      <Link href="/" className="site-header-brand">
        {t("meta.title")}
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
