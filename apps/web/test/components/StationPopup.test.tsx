// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StationPopup } from "@/components/ui/StationPopup";
import type { SelectedStation } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
  props: {
    id: "old-1",
    nom: "Ancienne Gare",
    uic: "87000000",
  },
};

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
      props: { id: "fallback-id", nom: undefined, uic: "87000001" },
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

  it("has dialog role", () => {
    render(<StationPopup selected={activeStation} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
