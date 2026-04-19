import { useTranslation } from "react-i18next";
import { Toggle } from "./Toggle";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { STATION_COLOR, INACTIVE_COLOR } from "@/constants";
import type { TrainInfo } from "@/types";

type Props = {
  showActive: boolean;
  showInactive: boolean;
  onToggleActive: () => void;
  onToggleInactive: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  enable3D: boolean;
  onToggle3D: () => void;
  showTrains: boolean;
  onToggleTrains: () => void;
  trains: TrainInfo[];
};

export const ControlPanel = (props: Props) => {
  const { t } = useTranslation();

  return (
    <div className="fixed left-4 top-4 z-50 w-[calc(100vw-2rem)] sm:w-80 rounded-xl bg-white shadow-xl">
      <div className="border-b border-gray-100 px-4 py-3">
        <h1 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gray-900">
          <img
            src="/locomotive.png"
            alt=""
            className="h-6 w-6 object-contain"
          />
          {t("app.name")}
        </h1>
      </div>
      <div className="border-b border-gray-100 px-4 py-3">
        <SectionLabel>{t("control.section")}</SectionLabel>
        <div className="space-y-2.5">
          <LayerToggle
            label={t("control.active")}
            color={STATION_COLOR}
            enabled={props.showActive}
            onToggle={props.onToggleActive}
          />
          <LayerToggle
            label={t("control.inactive")}
            color={INACTIVE_COLOR}
            enabled={props.showInactive}
            onToggle={props.onToggleInactive}
          />
          {props.showInactive && props.trains.length > 0 && (
            <TrainsList trains={props.trains} />
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        <SectionLabel>{t("settings.title")}</SectionLabel>
        <div className="space-y-2.5">
          <SettingToggle
            label={t("settings.showStats")}
            enabled={props.showStats}
            onToggle={props.onToggleStats}
          />
          <SettingToggle
            label={t("settings.enable3D")}
            enabled={props.enable3D}
            onToggle={props.onToggle3D}
          />
          <SettingToggle
            label={t("settings.showTrains")}
            enabled={props.showTrains}
            onToggle={props.onToggleTrains}
          />
          <LanguagePicker />
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
    {children}
  </p>
);

const LayerToggle = ({
  label,
  color,
  enabled,
  onToggle,
}: {
  label: string;
  color: string;
  enabled: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
    <Toggle enabled={enabled} onToggle={onToggle} aria-label={label} />
  </div>
);

const SettingToggle = ({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-700">{label}</span>
    <Toggle enabled={enabled} onToggle={onToggle} aria-label={label} />
  </div>
);

const TrainsList = ({ trains }: { trains: TrainInfo[] }) => {
  const { t } = useTranslation();

  return (
    <div className="pl-4">
      <p className="mb-1 text-xs font-medium text-gray-400">
        {t("control.trains")}
      </p>
      <div className="space-y-1">
        {trains.map((train) => (
          <button
            key={train.label}
            onClick={train.flyTo}
            className="block w-full truncate rounded px-2 py-0.5 text-left text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            {train.label}
            {train.nearStation && (
              <span className="text-gray-400">
                {" "}
                ({t("control.trainNear", { station: train.nearStation })})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const LanguagePicker = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{t("settings.language")}</span>
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
  );
};
