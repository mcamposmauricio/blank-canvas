import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(255);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: t("auth.error"), description: "Email inválido", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(result.data, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
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

        {sent ? (
          <div className="text-center">
            <Mail className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("auth.resetLinkSent")}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t("auth.resetLinkSentDesc")}</p>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("auth.backToLogin")}
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-center mb-2">{t("auth.forgotPasswordTitle")}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{t("auth.forgotPasswordDesc")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-2">
                  {t("auth.email")}
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.email")}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.sendResetLink")}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button variant="link" className="text-sm" onClick={() => navigate("/auth")}>
                <ArrowLeft className="mr-1 h-3 w-3" />
                {t("auth.backToLogin")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
