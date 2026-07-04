import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Tell us your name").max(80),
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const from = location.state?.from?.pathname || "/";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ fullName, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${from}`,
            data: {
              full_name: parsed.data.fullName,
              role: "admin"
            },
          },
        });
        if (error) {
          toast.error(error.message.includes("already") ? "That email is already registered" : error.message);
          return;
        }
        toast.success("Welcome to Easi Ride");
        navigate(from, { replace: true });
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message.includes("Invalid") ? "Invalid email or password" : error.message);
          return;
        }
        toast.success("Welcome back");
        navigate(from, { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent! Check your email.");
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${from}` },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="glass-card animate-fade-up w-full max-w-md rounded-3xl p-8 shadow-elevated">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" && "Sign in to manage the Easi Ride platform."}
            {mode === "signup" && "Register as an administrator."}
            {mode === "forgot" && "Enter your email to receive a reset link."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-6 w-full"
                onClick={handleGoogle}
                disabled={busy}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
                </svg>
                Continue with Google
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-hairline" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-hairline" />
              </div>
            </>
          )}

          <form onSubmit={mode === "forgot" ? handleResetPassword : handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aminata Sesay"
                  maxLength={80}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={72}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className={`mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground ${mode === "forgot" ? "pt-4" : ""}`}
          >
            {mode === "signin" && "New here? Create an account"}
            {mode === "signup" && "Already have an account? Sign in"}
            {mode === "forgot" && "Back to sign in"}
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
