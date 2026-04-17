// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsPanel } from "@/components/ui/StatsPanel";
import type { StatsData } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}(${JSON.stringify(opts)})` : key,
    i18n: { language: "fr" },
  }),
}));

const mockStats: StatsData = {
  activeLines: { totalKm: 10_000, visibleKm: 250 },
  abandonedLines: { totalKm: 5_000, visibleKm: 100 },
  activeStations: { total: 3_000, visible: 42 },
  oldStations: { total: 1_500, visible: 10 },
};

describe("StatsPanel", () => {
  it("shows no-data message when stats is null", () => {
    render(<StatsPanel stats={null} showActive={true} showInactive={false} />);
    expect(screen.getByText("stats.noData")).toBeInTheDocument();
  });

  it("shows no-data message when both layers are hidden", () => {
    render(
      <StatsPanel stats={mockStats} showActive={false} showInactive={false} />,
    );
    expect(screen.getByText("stats.noData")).toBeInTheDocument();
  });

  it("renders lines row when active layer is shown", () => {
    render(
      <StatsPanel stats={mockStats} showActive={true} showInactive={false} />,
    );
    expect(screen.getByText("stats.lines")).toBeInTheDocument();
  });

  it("renders active stations row", () => {
    render(
      <StatsPanel stats={mockStats} showActive={true} showInactive={false} />,
    );
    expect(screen.getByText("stats.activeStations")).toBeInTheDocument();
  });

  it("renders old stations row when inactive layer is shown", () => {
    render(
      <StatsPanel stats={mockStats} showActive={false} showInactive={true} />,
    );
    expect(screen.getByText("stats.oldStations")).toBeInTheDocument();
  });

  it("has correct aria region label", () => {
    render(<StatsPanel stats={null} showActive={false} showInactive={false} />);
    expect(
      screen.getByRole("region", { name: "stats.title" }),
    ).toBeInTheDocument();
  });
});
