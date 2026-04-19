// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StationPopup } from "@/components/ui/StationPopup";
import type { SelectedStation } from "@/types";
import { DATA_URLS } from "@/api";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  mockFetch.mockReturnValue(new Promise(() => {})); // default: never resolves
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const activeStation: SelectedStation = {
  kind: "active",
  props: {
    id: "1",
    nom: "Paris Gare de Lyon",
    libellecourt: "PARIS-LYON",
    segment_drg: "UIC 123",
    codes_uic: "87686006",
    codeinsee: "75112",
  },
};

const oldStation: SelectedStation = {
  kind: "old",
  props: { id: "old-1", nom: "Ancienne Gare", uic: "87000000" },
};

const mockSncfData = {
  departures: [
    {
      id: "dep-1",
      line: "TGV 6201",
      direction: "Paris Montparnasse",
      time: "20260418T143000",
      baseTime: "20260418T143000",
    },
    {
      id: "dep-2",
      line: "IC 4500",
      direction: "Lyon Part-Dieu",
      time: "20260418T150000",
      baseTime: "20260418T145000",
    },
  ],
  arrivals: [
    {
      id: "arr-1",
      line: "TGV 6200",
      direction: "Marseille Saint-Charles",
      time: "20260418T141500",
      baseTime: "20260418T141500",
    },
  ],
  lines: [
    { id: "line-tgv", mode: "TGV" },
    { id: "line-ter", mode: "TER" },
  ],
};

const okResponse = (data: unknown) =>
  ({
    ok: true,
    json: async () => data,
  }) as Response;

describe("StationPopup", () => {
  it("displays active station name", () => {
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(screen.getByText("Paris Gare de Lyon")).toBeInTheDocument();
  });

  it("displays active station short label", () => {
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(screen.getByText("PARIS-LYON")).toBeInTheDocument();
  });

  it("displays active station UIC code", () => {
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(screen.getByText("87686006")).toBeInTheDocument();
  });

  it("displays old station name", () => {
    render(<StationPopup selected={oldStation} onClose={() => {}} />);
    expect(screen.getByText("Ancienne Gare")).toBeInTheDocument();
  });

  it("falls back to id when old station has no nom", () => {
    const noName: SelectedStation = {
      kind: "old",
      props: { id: "fallback-id", uic: "87000001" },
    };
    render(<StationPopup selected={noName} onClose={() => {}} />);
    expect(screen.getByText("fallback-id")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<StationPopup selected={activeStation} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "popup.close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has region role", () => {
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(
      screen.getByRole("region", { name: "Paris Gare de Lyon" }),
    ).toBeInTheDocument();
  });

  it("shows loading spinner while fetching SNCF data", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not fetch for old stations", () => {
    render(<StationPopup selected={oldStation} onClose={() => {}} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches SNCF data using the station UIC", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(mockFetch).toHaveBeenCalledWith(
      DATA_URLS.sncfStation("87686006"),
      expect.any(Object),
    );
  });

  it("shows SNCF sections after successful fetch", async () => {
    mockFetch.mockResolvedValue(okResponse(mockSncfData));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("popup.departures")).toBeInTheDocument();
      expect(screen.getByText("popup.arrivals")).toBeInTheDocument();
      expect(screen.getByText("popup.lines")).toBeInTheDocument();
    });
  });

  it("displays departure times and directions", async () => {
    mockFetch.mockResolvedValue(okResponse(mockSncfData));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("14:30")).toBeInTheDocument();
      expect(screen.getByText("Paris Montparnasse")).toBeInTheDocument();
    });
  });

  it("shows strikethrough original time for delayed trains", async () => {
    mockFetch.mockResolvedValue(okResponse(mockSncfData));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      const strikethrough = document.querySelector(".line-through");
      expect(strikethrough).toBeInTheDocument();
      expect(strikethrough?.textContent).toBe("14:50");
    });
  });

  it("displays line mode badges", async () => {
    mockFetch.mockResolvedValue(okResponse(mockSncfData));
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("TGV")).toBeInTheDocument();
      expect(screen.getByText("TER")).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response);
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("popup.sncfError")).toBeInTheDocument();
    });
  });

  it("shows no-departures message when list is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ ...mockSncfData, departures: [] }),
    );
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("popup.noDepartures")).toBeInTheDocument();
    });
  });
});
