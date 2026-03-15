import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Mail, Lock, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";

interface InviteProfile {
  id: string;
  email: string;
  display_name: string | null;
  invite_token: string;
  invite_status: string;
  specialty: string[];
  tenant_id: string | null;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteProfile, setInviteProfile] = useState<InviteProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { user: authUser } = useAuthContext();

  useEffect(() => {
    if (authUser && !inviteToken) navigate("/nps/dashboard", { replace: true });
  }, [authUser, navigate, inviteToken]);

  useEffect(() => {
    if (!inviteToken) return;
    const loadInvite = async () => {
      setInviteLoading(true);
      setInviteError(false);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, display_name, invite_token, invite_status, specialty, tenant_id")
        .eq("invite_token", inviteToken)
        .eq("invite_status", "pending")
        .maybeSingle();
      if (error || !data) {
        setInviteError(true);
      } else {
        setInviteProfile(data as InviteProfile);
        setEmail(data.email);
        setDisplayName(data.display_name || "");

        // Check if user already has an auth account (existing user accepting invite for new tenant)
        if (authUser && authUser.email === data.email) {
          setIsExistingUser(true);
        }
      }
      setInviteLoading(false);
    };
    loadInvite();
  }, [inviteToken, authUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteProfile) return;
    setLoading(true);
    try {
      let userId: string;

      if (isExistingUser && authUser) {
        // Existing user accepting invite for a new tenant — no need to sign up
        userId = authUser.id;
      } else {
        // Try to sign in first (user might already have an auth account)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteProfile.email,
          password,
        });

        if (signInData?.user) {
          // Existing auth user — login succeeded
          userId = signInData.user.id;
          setIsExistingUser(true);
        } else {
          // New user — sign up
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: inviteProfile.email,
            password,
            options: {
              data: { display_name: displayName || inviteProfile.display_name },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          });
          if (signUpError) throw signUpError;
          userId = signUpData.user?.id || "";
          if (!userId) throw new Error("User creation failed");
        }
      }

      // Call edge function to accept invite (bypasses RLS for role creation)
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke("backoffice-admin", {
        body: {
          action: "accept-invite",
          inviteToken: inviteProfile.invite_token,
          userId,
          displayName: displayName || inviteProfile.display_name,
        },
      });
      if (acceptError) throw new Error(acceptError.message || "Failed to accept invite");
      if (acceptData?.error) throw new Error(acceptData.error);

      if (isExistingUser) {
        toast({ title: "Convite aceito!", description: "Você agora tem acesso à nova plataforma." });
        // Force reload to pick up new tenant
        window.location.href = "/nps/dashboard";
      } else {
        toast({ title: t("auth.signupSuccess"), description: t("auth.checkEmail") });
        navigate("/auth", { replace: true });
      }
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Existing user accepting invite — simplified flow
  const handleAcceptAsExistingUser = async () => {
    if (!inviteProfile || !authUser) return;
    setLoading(true);
    try {
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke("backoffice-admin", {
        body: {
          action: "accept-invite",
          inviteToken: inviteProfile.invite_token,
          userId: authUser.id,
          displayName: authUser.user_metadata?.display_name || inviteProfile.display_name,
        },
      });
      if (acceptError) throw new Error(acceptError.message || "Failed to accept invite");
      if (acceptData?.error) throw new Error(acceptData.error);

      toast({ title: "Convite aceito!", description: "Você agora tem acesso à nova plataforma." });
      window.location.href = "/nps/dashboard";
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cardClasses = "w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg";

  // Invite loading
  if (inviteToken && inviteLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className={cardClasses + " text-center"}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">{t("auth.loadingInvite")}</p>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className={cardClasses + " text-center"}>
          <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{t("auth.inviteInvalid")}</h2>
          <p className="text-muted-foreground mb-4">{t("auth.inviteInvalidDesc")}</p>
          <Button onClick={() => navigate("/auth", { replace: true })} variant="outline">
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  // Existing user already logged in — simplified accept
  if (inviteToken && inviteProfile && isExistingUser && authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className={cardClasses}>
          <div className="flex justify-center mb-6">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
          </div>
          <div className="text-center mb-6">
            <Badge variant="accent" className="mb-2">
              <UserPlus className="h-3 w-3 mr-1" />Convite para nova plataforma
            </Badge>
            <h2 className="text-lg font-semibold">Olá, {authUser.user_metadata?.display_name || authUser.email}!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Você foi convidado para acessar uma nova plataforma. Clique abaixo para aceitar.
            </p>
          </div>
          <Button onClick={handleAcceptAsExistingUser} className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aceitar convite
          </Button>
        </div>
      </div>
    );
  }

  // Invite acceptance form (new user)
  if (inviteToken && inviteProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className={cardClasses}>
          <div className="flex justify-center mb-6">
            <img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto" />
          </div>
          <div className="text-center mb-6">
            <Badge variant="accent" className="mb-2">
              <UserPlus className="h-3 w-3 mr-1" />{t("auth.inviteBadge")}
            </Badge>
            <h2 className="text-lg font-semibold">{t("auth.welcomeInvite")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.completeSignup")}</p>
          </div>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">{t("auth.displayName")}</label>
              <Input id="invite-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.displayNamePlaceholder")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">{t("auth.email")}</label>
              <Input value={inviteProfile.email} disabled className="opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">{t("auth.password")}</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} />
              <p className="text-xs text-muted-foreground mt-1">
                Se você já possui conta, use sua senha atual. Caso contrário, defina uma nova senha.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.acceptInvite")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Default login
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className={cardClasses + " animate-scale-in"}>
        <div className="flex justify-center mb-6">
          <img src="/logo-light.svg" alt="Journey" className="h-10 w-auto" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">{t("auth.email")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")} required className="pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} className="pl-10" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.login")}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button type="button" onClick={() => navigate("/auth/forgot-password")}
            className="text-sm text-accent hover:text-accent/80 transition-colors block w-full">
            {t("auth.forgotPassword")}
          </button>
          <button type="button" onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground/70 transition-colors block w-full">
            {t("auth.discoverJourney")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
