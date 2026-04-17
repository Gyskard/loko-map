import { useTranslation } from "react-i18next";
import { Toggle } from "./Toggle";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { STATION_COLOR, INACTIVE_COLOR } from "@/mapConstants";

type Props = {
  showActive: boolean;
  showInactive: boolean;
  onToggleActive: () => void;
  onToggleInactive: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  enable3D: boolean;
  onToggle3D: () => void;
};

export function ControlPanel({
  showActive,
  showInactive,
  onToggleActive,
  onToggleInactive,
  showStats,
  onToggleStats,
  enable3D,
  onToggle3D,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <div className="fixed left-4 top-4 z-50 w-70 rounded-xl bg-white shadow-xl">
      <div className="border-b border-gray-100 px-4 py-3">
        <h1 className="text-sm font-bold tracking-wide text-gray-900">
          {t("app.name")}
        </h1>
      </div>
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          {t("control.section")}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: STATION_COLOR }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700">
                {t("control.active")}
              </span>
            </div>
            <Toggle
              enabled={showActive}
              onToggle={onToggleActive}
              aria-label={t("control.active")}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: INACTIVE_COLOR }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700">
                {t("control.inactive")}
              </span>
            </div>
            <Toggle
              enabled={showInactive}
              onToggle={onToggleInactive}
              aria-label={t("control.inactive")}
            />
          </div>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          {t("settings.title")}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.showStats")}
            </span>
            <Toggle
              enabled={showStats}
              onToggle={onToggleStats}
              aria-label={t("settings.showStats")}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.enable3D")}
            </span>
            <Toggle
              enabled={enable3D}
              onToggle={onToggle3D}
              aria-label={t("settings.enable3D")}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.language")}
            </span>
            <div
              className="flex rounded-lg border border-gray-200 text-xs font-medium"
              role="group"
              aria-label={t("settings.language")}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  aria-pressed={i18n.language === lang}
                  className={`px-2.5 py-1 transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    i18n.language === lang
                      ? "bg-gray-800 text-white"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
