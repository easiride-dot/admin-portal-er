import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RideProvider } from "@/context/RideContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

// Admin Pages
import { Dashboard as Overview } from "./pages/admin/Overview";
import { Students } from "./pages/admin/Students";
import { Drivers } from "./pages/admin/Drivers";
import { RideRequests } from "./pages/admin/RideRequests";
import { Payments } from "./pages/admin/Payments";
import { Pricing } from "./pages/admin/Pricing";
import { Settings } from "./pages/admin/Settings";
import { Colleges } from "./pages/admin/Colleges";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <RideProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              <Route
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Overview />} />
                <Route path="/students" element={<Students />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/requests" element={<RideRequests />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/access" element={<Settings />} />
                <Route path="/colleges" element={<Colleges />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </RideProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
