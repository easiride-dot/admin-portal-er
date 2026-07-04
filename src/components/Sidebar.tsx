import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CarFront, 
  ListChecks, 
  CreditCard, 
  LogOut,
  ChevronRight,
  ChevronDown,
  Settings,
  DollarSign,
  Shield,
  Building2
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Students", to: "/students", icon: Users },
  { label: "Drivers", to: "/drivers", icon: CarFront },
  { label: "Ride Requests", to: "/requests", icon: ListChecks },
  { label: "Payments", to: "/payments", icon: CreditCard },
];

const configItems = [
  { label: "Pricing", to: "/pricing", icon: DollarSign },
  { label: "Access", to: "/access", icon: Shield },
  { label: "Colleges", to: "/colleges", icon: Building2 },
];

type SidebarProps = {
  onNavClick?: () => void;
};

export const Sidebar = ({ onNavClick }: SidebarProps) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const inConfig = configItems.some((i) => location.pathname === i.to);
  const [configOpen, setConfigOpen] = useState(inConfig);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-hairline/60 bg-background">
      <div className="p-6">
        <Logo />
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Operations Portal
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onNavClick}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-foreground text-background shadow-soft" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4",
                isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          );
        })}

        {/* Configuration group */}
        <div>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              inConfig
                ? "bg-foreground text-background shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className={cn(
              "h-4 w-4",
              inConfig ? "text-background" : "text-muted-foreground"
            )} />
            <span className="flex-1 text-left">Configuration</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              configOpen && "rotate-180"
            )} />
          </button>
          {configOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-hairline/60 pl-2">
              {configItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={onNavClick}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-hairline/60">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
          onClick={() => { signOut(); onNavClick?.(); }}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};
