import { useEffect, useState } from "react";
import { APP_NAME } from "@loko-map/shared";

function App() {
  const [health, setHealth] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.message))
      .catch(() => setHealth("failed to connect"));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="mb-4 text-5xl font-bold">{APP_NAME}</h1>
      <p className="mb-2 text-lg text-gray-400">
        API: <span className="text-green-400">{health}</span>
      </p>
    </div>
  );
}

export default App;
