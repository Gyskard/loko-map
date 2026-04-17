// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlPanel } from "@/components/ui/ControlPanel";

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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ControlPanel", () => {
  it("renders the app name", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getByText("app.name")).toBeInTheDocument();
  });

  it("renders all four toggle switches", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });

  it("active toggle reflects showActive prop", () => {
    render(<ControlPanel {...defaultProps} showActive={true} />);
    const toggle = screen.getByRole("switch", { name: "control.active" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
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

  it("renders language buttons", () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getByText("FR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});
