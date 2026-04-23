import { Database, Cpu, Brain } from "lucide-react";

const ITEMS = [
  {
    icon: Database,
    title: "3,195 Counties",
    desc: "Training data from every US county with food, economic, and demographic features",
  },
  {
    icon: Cpu,
    title: "XGBoost ML Models",
    desc: "5 separate gradient-boosted models, each cross-validated with R² scores of 0.78–0.96",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Llama 3.3 70B generates personalized recommendations based on your county's specific data profile",
  },
];

export const HowItWorks = () => (
  <section className="bg-secondary/60 py-16 px-4 md:px-8 border-y border-border">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-10">How this works</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="text-center px-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary-soft text-primary-deep mb-4">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
