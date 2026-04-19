import { MapViewer } from "@/components/Map";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const App = () => (
  <ErrorBoundary>
    <div className="w-screen h-screen">
      <MapViewer />
    </div>
  </ErrorBoundary>
);

export default App;
