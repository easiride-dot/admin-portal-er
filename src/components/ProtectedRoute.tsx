import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [exists, setExists] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkUserExists = async () => {
      if (!user) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (error || !data) {
          console.warn("User profile not found, signing out...");
          setExists(false);
          await signOut();
        } else {
          setExists(true);
        }
      } catch (err) {
        console.error("User verification failed:", err);
      } finally {
        setVerifying(false);
      }
    };

    if (!authLoading) {
      checkUserExists();
    }
  }, [user, authLoading, signOut]);

  if (authLoading || verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (!user || !exists) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center animate-fade-up">
        <div className="glass-card rounded-2xl p-8 max-w-sm w-full">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <span className="text-destructive font-bold text-xl">!</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You don't have administrator privileges to view this page.
          </p>
          <Button onClick={signOut} className="w-full" variant="outline">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
