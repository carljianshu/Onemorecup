"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { downloadAdminBackup, loadLatestAdminBackup, type AdminBackupSnapshot } from "@/lib/admin-backup";

export function AdminBackupPanel() {
  const { t, formatOpensAt } = useLocale();
  const [backup, setBackup] = useState<AdminBackupSnapshot | null>(null);

  useEffect(() => {
    const refresh = () => setBackup(loadLatestAdminBackup());
    refresh();
    window.addEventListener("onemorecup-admin-backup", refresh);
    return () => window.removeEventListener("onemorecup-admin-backup", refresh);
  }, []);

  function handleExport() {
    if (downloadAdminBackup(backup)) {
      return;
    }
    window.alert(t("admin.backupExportEmpty"));
  }

  return (
    <section className="card" style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>{t("admin.backupTitle")}</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{t("admin.backupDesc")}</p>
      {backup ? (
        <ul style={{ margin: "0 0 1rem", paddingLeft: "1.25rem" }}>
          <li>{t("admin.backupLastSaved", { time: formatOpensAt(backup.savedAt) ?? backup.savedAt })}</li>
          <li>{t("admin.backupVersion", { version: backup.version })}</li>
          <li>{t("admin.backupCounts", { players: backup.players.length, picks: backup.picks.length })}</li>
        </ul>
      ) : (
        <p style={{ color: "var(--muted)" }}>{t("admin.backupEmpty")}</p>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport} disabled={!backup}>
        {t("admin.backupExport")}
      </button>
    </section>
  );
}
