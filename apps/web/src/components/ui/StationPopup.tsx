import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SelectedStation, TrainRow, SncfData } from "@/types";
import { DATA_URLS } from "@/api";
import { parseSncfTime } from "@/utils/time";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; data: SncfData };

const TrainRowItem = ({ row }: { row: TrainRow }) => {
  const delayed = !!row.baseTime && row.time !== row.baseTime;

  return (
    <div className="flex items-baseline gap-2">
      <span className="w-10 shrink-0 font-mono text-xs font-semibold text-gray-800">
        {parseSncfTime(row.time)}
      </span>
      {delayed && (
        <span className="font-mono text-xs text-red-400 line-through">
          {parseSncfTime(row.baseTime)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-gray-600">
        {row.direction}
      </span>
      <span
        className="shrink-0 max-w-[6rem] truncate rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-500"
        title={row.line}
      >
        {row.line}
      </span>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-gray-100 pt-2">
    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
      {title}
    </p>
    {children}
  </div>
);

type Props = {
  selected: SelectedStation;
  onClose: () => void;
};

export const StationPopup = ({
  selected,
  onClose,
}: {
  selected: SelectedStation;
  onClose: () => void;
}) => {
  // Station id is used as key to automatically reset component when user clicks on an another station
  return (
    <StationPopupInner
      key={selected.props.id}
      selected={selected}
      onClose={onClose}
    />
  );
};

const StationPopupInner = ({ selected, onClose }: Props) => {
  const { t } = useTranslation();
  const { props } = selected;

  const [fetchState, setFetchState] = useState<FetchState>(
    selected.kind === "active" ? { status: "loading" } : { status: "idle" },
  );

  useEffect(() => {
    if (selected.kind !== "active") return;

    const controller = new AbortController();

    const uic = (
      selected.props.codes_uic.split(/[,;]/)[0] ?? selected.props.codes_uic
    ).trim();

    fetch(DATA_URLS.sncfStation(uic), {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: SncfData) => setFetchState({ status: "ok", data }))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError")
          setFetchState({ status: "error" });
      });

    return () => controller.abort();
  }, [selected]);

  const stationName =
    selected.kind === "old" ? (props.nom ?? props.id) : props.nom;

  return (
    <div
      className="fixed bottom-4 right-4 z-10 flex w-[calc(100vw-2rem)] sm:w-80 max-h-[60vh] flex-col rounded-xl bg-white shadow-2xl"
      role="region"
      aria-label={stationName}
    >
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold leading-tight text-gray-900">
              {stationName}
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
            className="ml-3 -mr-1 -mt-1 p-2 text-lg leading-none text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pl-4 pr-5 pb-4 space-y-2 text-sm">
        {selected.kind === "active" ? (
          <>
            <div className="space-y-1.5 border-t border-gray-100 pt-2">
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
            </div>

            {fetchState.status === "loading" && (
              <div className="flex justify-center py-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              </div>
            )}
            {fetchState.status === "error" && (
              <p className="text-xs italic text-gray-400">
                {t("popup.sncfError")}
              </p>
            )}
            {fetchState.status === "ok" && (
              <>
                {fetchState.data.lines.length > 0 && (
                  <Section title={t("popup.lines")}>
                    <div className="flex flex-wrap gap-1">
                      {fetchState.data.lines.map((l) => (
                        <span
                          key={l.id}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
                        >
                          {l.mode}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title={t("popup.departures")}>
                  {fetchState.data.departures.length === 0 ? (
                    <p className="text-xs italic text-gray-400">
                      {t("popup.noDepartures")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {fetchState.data.departures.map((row) => (
                        <TrainRowItem key={row.id} row={row} />
                      ))}
                    </div>
                  )}
                </Section>

                <Section title={t("popup.arrivals")}>
                  {fetchState.data.arrivals.length === 0 ? (
                    <p className="text-xs italic text-gray-400">
                      {t("popup.noArrivals")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {fetchState.data.arrivals.map((row) => (
                        <TrainRowItem key={row.id} row={row} />
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </>
        ) : (
          <div className="border-t border-gray-100 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.uic")}</span>
              <span className="font-mono text-gray-700">
                {selected.props.uic}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
