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
    render(
      <StatsPanel
        stats={null}
        showActive={true}
        showInactive={false}
        trainsCount={0}
      />,
    );
    expect(screen.getByText("stats.noData")).toBeInTheDocument();
  });

  it("shows no-data message when both layers are hidden", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={false}
        showInactive={false}
        trainsCount={0}
      />,
    );
    expect(screen.getByText("stats.noData")).toBeInTheDocument();
  });

  it("renders lines row when active layer is shown", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={true}
        showInactive={false}
        trainsCount={0}
      />,
    );
    expect(screen.getByText("stats.lines")).toBeInTheDocument();
  });

  it("renders active stations row", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={true}
        showInactive={false}
        trainsCount={0}
      />,
    );
    expect(screen.getByText("stats.activeStations")).toBeInTheDocument();
  });

  it("renders old stations row when inactive layer is shown", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={false}
        showInactive={true}
        trainsCount={0}
      />,
    );
    expect(screen.getByText("stats.oldStations")).toBeInTheDocument();
  });

  it("does not render trains row when trainsCount is 0", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={true}
        showInactive={true}
        trainsCount={0}
      />,
    );
    expect(screen.queryByText("stats.trains")).not.toBeInTheDocument();
  });

  it("renders trains row when trainsCount is greater than 0", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={true}
        showInactive={true}
        trainsCount={4}
      />,
    );
    expect(screen.getByText("stats.trains")).toBeInTheDocument();
  });

  it("displays the correct trains count", () => {
    render(
      <StatsPanel
        stats={mockStats}
        showActive={false}
        showInactive={false}
        trainsCount={4}
      />,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("trains row shows even when both layers are hidden", () => {
    render(
      <StatsPanel
        stats={null}
        showActive={false}
        showInactive={false}
        trainsCount={3}
      />,
    );
    expect(screen.getByText("stats.trains")).toBeInTheDocument();
    expect(screen.queryByText("stats.noData")).not.toBeInTheDocument();
  });

  it("has correct aria region label", () => {
    render(
      <StatsPanel
        stats={null}
        showActive={false}
        showInactive={false}
        trainsCount={0}
      />,
    );
    expect(
      screen.getByRole("region", { name: "stats.title" }),
    ).toBeInTheDocument();
  });
});
