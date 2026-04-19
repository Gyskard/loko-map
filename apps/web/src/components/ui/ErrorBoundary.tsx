import { Component } from "react";
import type { ReactNode } from "react";
import i18n from "@/i18n";

type Props = { children: ReactNode };
type State = { crashed: boolean };

// Specific case of using a class component due do the ErrorBoundary system of React

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  // Specific static method needed by React
  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  // Banner when something wrong happened
  render() {
    if (this.state.crashed) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-gray-50 text-gray-700">
          <p className="text-lg font-semibold">{i18n.t("errors.crashed")}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            {i18n.t("errors.reload")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
