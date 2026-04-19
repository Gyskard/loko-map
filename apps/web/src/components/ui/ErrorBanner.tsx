import { useTranslation } from "react-i18next";

export const ErrorBanner = ({ onClose }: { onClose: () => void }) => {
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
        className="p-2 text-red-400 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 rounded"
      >
        ×
      </button>
    </div>
  );
};
