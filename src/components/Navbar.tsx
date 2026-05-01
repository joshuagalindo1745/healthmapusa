import { Activity } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Navbar = () => {
  const { pathname } = useLocation();
  const scrollToFooter = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Activity className="h-5 w-5" strokeWidth={2.5} />
          <span>HealthMap</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            to="/spotlight"
            className={
              "hover:text-foreground transition-base " +
              (pathname === "/spotlight" ? "text-primary" : "")
            }
          >
            City Spotlight
          </Link>
          <a href="#about" onClick={scrollToFooter("about")} className="hover:text-foreground transition-base">About</a>
          <a href="#sources" onClick={scrollToFooter("sources")} className="hover:text-foreground transition-base">Data Sources</a>
        </nav>
      </div>
    </header>
  );
};
