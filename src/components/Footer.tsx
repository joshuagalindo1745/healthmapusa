export const Footer = () => (
  <footer className="bg-background border-t border-border py-12 px-4 md:px-8">
    <div className="max-w-6xl mx-auto space-y-8 text-sm text-muted-foreground">
      <div id="sources">
        <h3 className="font-semibold text-foreground mb-2">Data Sources</h3>
        <p className="leading-relaxed">
          USDA Food Environment Atlas · CDC PLACES · Robert Wood Johnson Foundation County Health
          Rankings · US Census Bureau · CMS Medicare Data
        </p>
      </div>
      <div id="about">
        <h3 className="font-semibold text-foreground mb-2">About / Disclaimer</h3>
        <p className="leading-relaxed">
          HealthMap provides county-level population health estimates based on publicly available
          data and machine learning models. This is not medical advice. Predictions reflect county
          averages and may not represent individual health outcomes. Consult a healthcare provider
          for personal health guidance.
        </p>
      </div>
      <p className="text-xs pt-4 border-t border-border">
        © 2025 HealthMap · Built with FastAPI, XGBoost, and React
      </p>
    </div>
  </footer>
);
