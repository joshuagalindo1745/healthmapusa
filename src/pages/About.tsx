import { Link } from "react-router-dom";
import { Activity, MapPin, Heart, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative bg-gradient-to-b from-primary-soft/40 to-background py-20 px-4 md:px-8 border-b border-border">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-4">OUR MISSION</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Why We Built HealthMap USA
            </h1>
            <p className="text-lg text-muted-foreground">
              Making the invisible forces that shape community health visible to everyone.
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-2xl mx-auto space-y-6 text-foreground/85 leading-[1.75]">
            <p>
              Growing up or living in a community shapes your health in ways that go far beyond
              personal choices. The neighborhood you live in, the grocery stores within reach, the
              air quality outside your window, the parks available for exercise, and even the
              stress of economic instability all play a profound role in determining your long-term
              health outcomes.
            </p>

            <blockquote className="border-l-4 border-primary pl-5 py-1 italic font-semibold text-foreground">
              Research consistently shows that zip code can be a stronger predictor of health than
              genetic code.
            </blockquote>

            <p>
              HealthMap USA was created to make these invisible forces visible. By mapping
              county-level health risk data across the United States — covering conditions like
              obesity, diabetes, physical inactivity, mental distress, and food insecurity — we
              give residents, researchers, and policymakers a clear picture of where communities
              are thriving and where they are struggling.
            </p>

            <p>
              Our goal is simple: when people can see the health landscape of their community, they
              are empowered to ask better questions, advocate for real change, and make more
              informed decisions for themselves and their families.
            </p>

            {/* Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
              {[
                {
                  icon: MapPin,
                  title: "See your community",
                  body: "County-level visibility into the health risks shaping daily life.",
                },
                {
                  icon: Heart,
                  title: "Understand the why",
                  body: "Connect outcomes to food access, economy, and environment.",
                },
                {
                  icon: Users,
                  title: "Drive real change",
                  body: "Equip residents and policymakers with shared, honest data.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="h-9 w-9 rounded-full bg-primary-soft flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            {/* Data Sources */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card mt-10">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">DATA SOURCES</p>
              <h3 className="font-semibold text-lg mb-4">Where our numbers come from</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">CDC PLACES — 2025 release</span> (based on 2023 BRFSS).
                  Tract- and county-level prevalence for obesity, diabetes, physical inactivity, mental distress, smoking, and hypertension.{" "}
                  <a className="text-primary underline" href="https://www.cdc.gov/places/" target="_blank" rel="noreferrer">cdc.gov/places</a>
                </li>
                <li>
                  <span className="font-medium text-foreground">USDA Food Environment Atlas — 2024 update.</span>{" "}
                  Food insecurity, SNAP participation, grocery and fast-food density, food environment index.{" "}
                  <a className="text-primary underline" href="https://www.ers.usda.gov/data-products/food-environment-atlas" target="_blank" rel="noreferrer">ers.usda.gov</a>
                </li>
                <li>
                  <span className="font-medium text-foreground">U.S. Census ACS 5-Year (2019–2023)</span> & TIGER/Line 2024 boundaries.
                  Demographics, income, education, and tract polygons.{" "}
                  <a className="text-primary underline" href="https://www.census.gov/programs-surveys/acs" target="_blank" rel="noreferrer">census.gov/acs</a>
                </li>
                <li>
                  <span className="font-medium text-foreground">EPA Smart Location Database (2021)</span> & County Health Rankings 2025.
                  Walkability index, active commuting, and contextual indicators.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/80 mt-4">
                Last refreshed: May 2026. National benchmarks on each card are CDC PLACES 2025 crude prevalence.
              </p>
            </div>


            <div className="flex justify-center pt-8">
              <Button asChild size="lg" className="rounded-full gap-2">
                <Link to="/">
                  <Activity className="h-4 w-4" />
                  Explore the map
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
