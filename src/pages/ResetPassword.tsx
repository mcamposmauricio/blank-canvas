import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setSessionReady(true);
            else setSessionError(true);
          });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: t("auth.error"), description: t("auth.passwordTooShort"), variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("auth.error"), description: t("auth.passwordMismatch"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: t("auth.resetSuccess"), description: t("auth.resetSuccessDesc") });
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-white/10 bg-card/80 backdrop-blur-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
        </div>

        {sessionError ? (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("auth.invalidResetLink")}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t("auth.invalidResetLinkDesc")}</p>
            <Button onClick={() => navigate("/auth/forgot-password")}>
              {t("auth.requestNewLink")}
            </Button>
          </div>
        ) : !sessionReady ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground text-sm">Verificando link...</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-center mb-6">{t("auth.resetPassword")}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-2">
                  {t("auth.newPassword")}
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                  {t("auth.confirmPassword")}
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.resetPassword")}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
