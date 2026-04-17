// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("renders with role=switch", () => {
    render(<Toggle enabled={false} onToggle={() => {}} aria-label="Test" />);
    expect(screen.getByRole("switch", { name: "Test" })).toBeInTheDocument();
  });

  it("reflects enabled=true via aria-checked", () => {
    render(<Toggle enabled={true} onToggle={() => {}} aria-label="Test" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("reflects enabled=false via aria-checked", () => {
    render(<Toggle enabled={false} onToggle={() => {}} aria-label="Test" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<Toggle enabled={false} onToggle={onToggle} aria-label="Test" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
