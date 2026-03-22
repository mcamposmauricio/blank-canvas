import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PermissionGuardProps {
  module: string;
  action?: "view" | "edit" | "delete" | "manage";
  requireMaster?: boolean;
  children: ReactNode;
}

export function PermissionGuard({ module, action = "view", requireMaster = false, children }: PermissionGuardProps) {
  const { hasPermission, isMaster, loading, userDataLoading } = useAuth();
  const navigate = useNavigate();

  if (loading || userDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (requireMaster && !isMaster) {
    return <AccessDenied onBack={() => navigate("/home")} />;
  }

  if (!hasPermission(module, action)) {
    return <AccessDenied onBack={() => navigate("/home")} />;
  }

  return <>{children}</>;
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Acesso negado</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Você não tem permissão para acessar esta página. Entre em contato com o administrador da sua organização.
      </p>
      <Button variant="outline" onClick={onBack}>
        Voltar ao início
      </Button>
    </div>
  );
}
