import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Conflict {
  companyId: string;
  companyName: string;
  existingBannerId: string;
  existingBannerTitle: string;
  overlapStart: string;
  overlapEnd: string | null;
}

interface BannerConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: Conflict[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BannerConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onConfirm,
  onCancel,
  isLoading,
}: BannerConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Conflito de Período Detectado
          </DialogTitle>
          <DialogDescription>
            As seguintes empresas já possuem banners ativos no período selecionado. Deseja publicar mesmo assim?
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Banner Existente</TableHead>
                <TableHead>Período de Sobreposição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.map((conflict, idx) => (
                <TableRow key={`${conflict.companyId}-${conflict.existingBannerId}-${idx}`}>
                  <TableCell className="font-medium">{conflict.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {conflict.existingBannerTitle}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(conflict.overlapStart), "dd/MM/yyyy")}
                    {" → "}
                    {conflict.overlapEnd ? format(new Date(conflict.overlapEnd), "dd/MM/yyyy") : "∞"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          {conflicts.length} empresa(s) afetada(s). Se publicar, os visitantes dessas empresas poderão ver múltiplos banners simultaneamente.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
            {isLoading ? "Publicando..." : "Publicar mesmo assim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BannerConflictDialog;
