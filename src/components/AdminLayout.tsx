import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export const AdminLayout = () => {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onNavClick={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-hairline/60 bg-background px-4 py-3">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <span className="text-sm font-semibold">Easi Ride — Operations Portal</span>
          </header>
          <main className="flex-1 overflow-y-auto bg-secondary/10 px-4 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-secondary/10 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
