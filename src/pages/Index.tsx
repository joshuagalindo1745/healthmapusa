import { useCallback, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SearchHero } from "@/components/SearchHero";
import { Results } from "@/components/Results";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import type { AppState, PredictResponse } from "@/types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [data, setData] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (address: string) => {
    setAppState("loading");
    setError(null);

    if (!API_URL) {
      setError("API URL not configured. Set VITE_API_URL to your deployed health-risk API.");
      setAppState("error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.detail) detail = j.detail;
        } catch { /* noop */ }
        setError(detail);
        setAppState("error");
        return;
      }

      const json: PredictResponse = await res.json();
      setData(json);
      setAppState("success");
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("Network error. Make sure the API is running.");
      setAppState("error");
    }
  }, []);

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <SearchHero
          appState={appState}
          error={error}
          lastResult={data}
          onSubmit={handleSubmit}
        />

        {appState === "loading" && <ResultsSkeleton />}
        {appState === "success" && data && <Results data={data} />}

        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
