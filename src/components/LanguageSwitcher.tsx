"use client";

import { LOCALES } from "@/i18n";
import { useLocale } from "@/context/LocaleContext";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {LOCALES.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          className={`lang-switcher-btn ${locale === id ? "active" : ""}`}
          onClick={() => setLocale(id)}
          aria-pressed={locale === id}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
