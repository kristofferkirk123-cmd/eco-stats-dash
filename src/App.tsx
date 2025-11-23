import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import { Activity, Settings as SettingsIcon, Bell } from "lucide-react";
import { cn } from "./lib/utils";

const queryClient = new QueryClient();

function Navigation() {
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold">Monitor</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/"
            className={cn(
              "px-4 py-2 rounded-md transition-colors",
              location.pathname === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Dashboard
          </Link>
          <Link
            to="/alerts"
            className={cn(
              "px-4 py-2 rounded-md transition-colors flex items-center gap-2",
              location.pathname === "/alerts"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Bell className="w-4 h-4" />
            Alerts
          </Link>
          <Link
            to="/settings"
            className={cn(
              "px-4 py-2 rounded-md transition-colors flex items-center gap-2",
              location.pathname === "/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
