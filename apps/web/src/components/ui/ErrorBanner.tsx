import { useTranslation } from "react-i18next";

type Props = {
  onClose: () => void;
};

export function ErrorBanner({ onClose }: Props) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 shadow-lg"
    >
      <span className="text-sm text-red-700">{t("errors.dataLoad")}</span>
      <button
        onClick={onClose}
        aria-label={t("popup.close")}
        className="text-red-400 hover:text-red-700"
      >
        ×
      </button>
    </div>
  );
}
