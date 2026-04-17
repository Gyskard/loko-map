import { useTranslation } from "react-i18next";
import type { StatsData } from "@/types";
import { LINE_COLOR, STATION_COLOR, INACTIVE_COLOR } from "@/mapConstants";

type StatRow =
  | {
      kind: "km";
      dot: string;
      label: string;
      visibleKm: number;
      totalKm: number;
    }
  | {
      kind: "count";
      dot: string;
      label: string;
      visible: number;
      total: number;
    };

function fmtKm(km: number) {
  return `${km.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} km`;
}

type Props = {
  stats: StatsData | null;
  showActive: boolean;
  showInactive: boolean;
};

export function StatsPanel({ stats, showActive, showInactive }: Props) {
  const { t, i18n } = useTranslation();
  const rows: StatRow[] = [];

  if (stats && (showActive || showInactive)) {
    const visibleKm =
      (showActive ? stats.activeLines.visibleKm : 0) +
      (showInactive ? stats.abandonedLines.visibleKm : 0);
    const totalKm =
      (showActive ? stats.activeLines.totalKm : 0) +
      (showInactive ? stats.abandonedLines.totalKm : 0);
    rows.push({
      kind: "km",
      dot: LINE_COLOR,
      label: t("stats.lines"),
      visibleKm,
      totalKm,
    });
  }
  if (showActive && stats) {
    rows.push({
      kind: "count",
      dot: STATION_COLOR,
      label: t("stats.activeStations"),
      ...stats.activeStations,
    });
  }
  if (showInactive && stats) {
    rows.push({
      kind: "count",
      dot: INACTIVE_COLOR,
      label: t("stats.oldStations"),
      ...stats.oldStations,
    });
  }

  return (
    <div
      className="fixed right-4 top-4 z-50 w-90 rounded-xl bg-white shadow-xl"
      aria-label={t("stats.title")}
      role="region"
    >
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold tracking-wide text-gray-900">
          {t("stats.title")}
        </h2>
      </div>
      <div className="px-4 py-3">
        {rows.length === 0 ? (
          <p className="text-xs italic text-gray-400">{t("stats.noData")}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: row.dot }}
                  aria-hidden="true"
                />
                <span className="text-xs text-gray-700">{row.label}</span>
                <span className="ml-auto whitespace-nowrap font-mono text-xs text-gray-500">
                  {row.kind === "km"
                    ? t("stats.visibleOfKm", {
                        visible: fmtKm(row.visibleKm),
                        total: fmtKm(row.totalKm),
                      })
                    : t("stats.visibleOfCount", {
                        visible: row.visible.toLocaleString(i18n.language),
                        total: row.total.toLocaleString(i18n.language),
                      })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
