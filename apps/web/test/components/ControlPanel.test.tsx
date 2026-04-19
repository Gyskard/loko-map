// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlPanel } from "@/components/ui/ControlPanel";
import type { TrainInfo } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "fr", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/i18n", () => ({
  SUPPORTED_LANGUAGES: ["fr", "en"],
}));

const defaultProps = {
  showActive: true,
  showInactive: false,
  onToggleActive: vi.fn(),
  onToggleInactive: vi.fn(),
  showStats: true,
  onToggleStats: vi.fn(),
  enable3D: false,
  onToggle3D: vi.fn(),
  showTrains: true,
  onToggleTrains: vi.fn(),
  trains: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ControlPanel", () => {
  it("renders the app name", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getByText("app.name")).toBeInTheDocument();
  });

  it("renders all five toggle switches", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("active toggle reflects showActive prop", () => {
    render(<ControlPanel {...defaultProps} showActive={true} />);
    const toggle = screen.getByRole("switch", { name: "control.active" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("inactive toggle reflects showInactive prop", () => {
    render(<ControlPanel {...defaultProps} showInactive={false} />);
    const toggle = screen.getByRole("switch", { name: "control.inactive" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("showTrains toggle reflects showTrains prop", () => {
    render(<ControlPanel {...defaultProps} showTrains={false} />);
    const toggle = screen.getByRole("switch", { name: "settings.showTrains" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggleActive when active toggle is clicked", () => {
    render(<ControlPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole("switch", { name: "control.active" }));
    expect(defaultProps.onToggleActive).toHaveBeenCalledOnce();
  });

  it("calls onToggleInactive when inactive toggle is clicked", () => {
    render(<ControlPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole("switch", { name: "control.inactive" }));
    expect(defaultProps.onToggleInactive).toHaveBeenCalledOnce();
  });

  it("calls onToggleTrains when trains toggle is clicked", () => {
    render(<ControlPanel {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("switch", { name: "settings.showTrains" }),
    );
    expect(defaultProps.onToggleTrains).toHaveBeenCalledOnce();
  });

  it("does not show trains list when showInactive is false", () => {
    const trains: TrainInfo[] = [{ label: "Locomotive 1", flyTo: vi.fn() }];
    render(
      <ControlPanel {...defaultProps} showInactive={false} trains={trains} />,
    );
    expect(screen.queryByText("Locomotive 1")).not.toBeInTheDocument();
  });

  it("shows trains list when showInactive is true and trains exist", () => {
    const trains: TrainInfo[] = [
      { label: "Locomotive 1", flyTo: vi.fn() },
      { label: "Locomotive 2", flyTo: vi.fn() },
    ];
    render(
      <ControlPanel {...defaultProps} showInactive={true} trains={trains} />,
    );
    expect(screen.getByText("Locomotive 1")).toBeInTheDocument();
    expect(screen.getByText("Locomotive 2")).toBeInTheDocument();
  });

  it("calls train flyTo when train button is clicked", () => {
    const flyTo = vi.fn();
    const trains: TrainInfo[] = [{ label: "Locomotive 1", flyTo }];
    render(
      <ControlPanel {...defaultProps} showInactive={true} trains={trains} />,
    );
    fireEvent.click(screen.getByText("Locomotive 1"));
    expect(flyTo).toHaveBeenCalledOnce();
  });

  it("displays nearStation label when provided", () => {
    const trains: TrainInfo[] = [
      { label: "Locomotive 1", nearStation: "Bordeaux", flyTo: vi.fn() },
    ];
    render(
      <ControlPanel {...defaultProps} showInactive={true} trains={trains} />,
    );
    expect(screen.getByText(/control\.trainNear/)).toBeInTheDocument();
  });

  it("renders language buttons", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getByText("FR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});
