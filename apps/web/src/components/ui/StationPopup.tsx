import { useTranslation } from "react-i18next";
import type { SelectedStation } from "@/types";

type Props = {
  selected: SelectedStation;
  onClose: () => void;
};

export function StationPopup({ selected, onClose }: Props) {
  const { t } = useTranslation();
  const { props } = selected;

  return (
    <div
      className="fixed bottom-8 left-4 z-10 w-64 rounded-xl bg-white p-4 shadow-2xl"
      role="dialog"
      aria-modal="false"
      aria-label={selected.kind === "old" ? (props.nom ?? props.id) : props.nom}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="font-bold leading-tight text-gray-900">
            {selected.kind === "old" ? (props.nom ?? props.id) : props.nom}
          </h2>
          {selected.kind === "active" && (
            <span className="font-mono text-xs text-gray-400">
              {selected.props.libellecourt}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={t("popup.close")}
          className="ml-3 mt-0.5 text-lg leading-none text-gray-400 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      <div className="space-y-1.5 border-t border-gray-100 pt-2 text-sm">
        {selected.kind === "active" ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.segment")}</span>
              <span className="font-medium text-gray-700">
                {selected.props.segment_drg}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.uic")}</span>
              <span className="font-mono text-gray-700">
                {selected.props.codes_uic}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.insee")}</span>
              <span className="font-mono text-gray-700">
                {selected.props.codeinsee}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-gray-400">{t("popup.uic")}</span>
            <span className="font-mono text-gray-700">
              {selected.props.uic}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
