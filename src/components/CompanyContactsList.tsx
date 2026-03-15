import { useState } from "react";
import { Star, User, Trash2, Edit, Plus, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
  external_id: string | null;
  public_token: string | null;
}

interface CompanyContactsListProps {
  contacts: CompanyContact[];
  onAddContact: () => void;
  onEditContact: (contact: CompanyContact) => void;
  onDeleteContact: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onContactClick?: (contact: CompanyContact) => void;
  loading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CompanyContactsList({
  contacts,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onSetPrimary,
  onContactClick,
  loading = false,
  canEdit = true,
  canDelete = true,
}: CompanyContactsListProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const copyPortalLink = (token: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("people.linkCopied") });
  };

  const copyExternalId = (externalId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!externalId) return;
    navigator.clipboard.writeText(externalId);
    toast({ title: t("companyDetails.copied") });
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("companyContacts.title")}</h3>
        {canEdit && (
          <Button size="sm" onClick={onAddContact}>
            <Plus className="h-4 w-4 mr-1" />
            {t("companyContacts.add")}
          </Button>
        )}
      </div>

      {sortedContacts.length === 0 ? (
        <Card className="p-6 text-center">
          <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t("companies.noContacts")}</p>
          {canEdit && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onAddContact}>
              <Plus className="h-4 w-4 mr-1" />
              {t("companyContacts.addFirst")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedContacts.map((contact) => (
            <Card
              key={contact.id}
              className={`p-3 hover:bg-accent/50 transition-colors ${onContactClick ? "cursor-pointer" : ""}`}
              onClick={() => onContactClick?.(contact)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-muted rounded-full shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{contact.name}</p>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="shrink-0">
                          <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                          {t("companies.primaryContact")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                    {(contact.role || contact.department) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {[contact.role, contact.department].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    )}
                    {contact.external_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          ID: {contact.external_id}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => copyExternalId(contact.external_id, e)}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {contact.public_token && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => copyPortalLink(contact.public_token, e)}
                      title={t("people.copyLink")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && !contact.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSetPrimary(contact.id)}
                      title={t("companyContacts.setAsPrimary")}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditContact(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteContactId(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companyContacts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("companyContacts.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteContactId) {
                  onDeleteContact(deleteContactId);
                  setDeleteContactId(null);
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
