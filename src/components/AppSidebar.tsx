import { useState } from "react";
import { useSidebarData } from "@/contexts/SidebarDataContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Languages,
  Building2,
  MessageSquare,
  TrendingUp,
  History,
  Flag,
  User,
  Inbox,
  Megaphone,
  Shield,
  Star,
  Sun,
  Moon,
  BookOpen,
  FileText,
  FolderOpen,
  Import,
  Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AppSidebar({ isDark, onToggleTheme }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const { user, isAdmin, isMaster, hasPermission, userDataLoading, isImpersonating, impersonatedTenantName } = useAuth();
  const { state } = useSidebar();
  
  const collapsed = state === "collapsed";

  const usePersistedState = (key: string, defaultValue = true) => {
    const [value, setValue] = useState(() => localStorage.getItem(key) !== "false" ? defaultValue : !defaultValue);
    const toggle = (open: boolean) => { setValue(open); localStorage.setItem(key, String(open)); };
    return [value, toggle] as const;
  };

  const [npsOpen, handleNpsOpen] = usePersistedState("sidebar-nps-open");
  const [chatOpen, handleChatOpen] = usePersistedState("sidebar-chat-open");
  
  const [workspaceOpen, handleWorkspaceOpen] = usePersistedState("sidebar-workspace-open");
  const [otherTeamsOpen, handleOtherTeamsOpen] = usePersistedState("sidebar-other-teams-open", false);
  const [backofficeOpen, handleBackofficeOpen] = usePersistedState("sidebar-backoffice-open");
  
  const [contactsOpen, handleContactsOpen] = usePersistedState("sidebar-contacts-open");
  const [helpOpen, handleHelpOpen] = usePersistedState("sidebar-help-open");

  const showChat = hasPermission("chat", "view") || hasPermission("chat.workspace", "view") || hasPermission("chat.history", "view") || hasPermission("chat.broadcasts", "view");
  const showNPS = hasPermission("nps", "view") || hasPermission("nps.dashboard", "view") || hasPermission("nps.campaigns", "view");
  const showContacts = hasPermission("contacts", "view") || hasPermission("contacts.companies", "view") || hasPermission("contacts.people", "view");
  const showHelp = hasPermission("help", "view") || hasPermission("help.articles", "view") || hasPermission("help.collections", "view");
  const { teamAttendants, otherTeamAttendants, totalActiveChats, otherTeamsTotalChats, unassignedCount } = useSidebarData();

  const isActive = (path: string) => location.pathname === path;

  const myAttendant = teamAttendants.find((a) => a.user_id === user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("nav.logoutSuccess"), description: t("nav.logoutMessage") });
    navigate("/auth");
  };


  const npsItems = [
    { path: "/nps/dashboard", icon: BarChart3, label: t("nav.metrics") },
    { path: "/nps/campaigns", icon: Send, label: t("nav.surveys") },
    { path: "/nps/nps-settings", icon: Settings, label: t("npsSettings.navLabel") },
  ];

  // Active item style — subtle bg + Metric Blue left border
  const activeItemCls =
    "bg-accent/10 border-l-[3px] border-accent pl-[calc(theme(spacing.3)-3px)] text-foreground";
  const groupLabelCls = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 px-2 py-1.5";

  const logoSrc = isDark ? "/logo-light.svg" : "/logo-dark.svg";
  const iconSrc = isDark ? "/logo-icon-light.svg" : "/logo-icon-dark.svg";

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 px-3 py-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              onClick={() => {
                if (isAdmin || showChat) navigate("/admin/dashboard");
                else if (showNPS) navigate("/nps/dashboard");
                else navigate("/nps/dashboard");
              }}
              className="flex items-center justify-center"
            >
              <img src={iconSrc} alt="Journey" className="h-7 w-7 object-contain" />
            </button>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors h-6 w-6" />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                if (isAdmin || showChat) navigate("/admin/dashboard");
                else if (showNPS) navigate("/nps/dashboard");
                else navigate("/nps/dashboard");
              }}
              className="flex items-center min-w-0"
            >
              <img src={logoSrc} alt="Journey" className="h-9 w-auto object-contain max-w-[200px]" />
            </button>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors h-7 w-7 shrink-0" />
          </div>
        )}
        {isImpersonating && !collapsed && (
          <div className="mt-2 text-[10px] font-medium text-muted-foreground text-center truncate px-1">
            {impersonatedTenantName}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {userDataLoading ? (
          <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Home */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/home")} isActive={isActive("/home")} tooltip="Home" className={cn(isActive("/home") ? activeItemCls : "hover:bg-sidebar-accent")}>
                      <Home className="h-4 w-4" /><span>{collapsed ? "" : "Home"}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Backoffice Master */}
            {isMaster && (
              <SidebarGroup>
                <Collapsible open={backofficeOpen} onOpenChange={handleBackofficeOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /><span>Backoffice</span></span>
                      {!collapsed && (backofficeOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/backoffice")} isActive={isActive("/backoffice")} tooltip="Backoffice" className={cn(isActive("/backoffice") ? activeItemCls : "hover:bg-sidebar-accent")}>
                            <Shield className="h-4 w-4" /><span>Painel Master</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Chat */}
            {showChat && (
              <SidebarGroup>
                <Collapsible open={chatOpen} onOpenChange={handleChatOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /><span>{t("chat.module")}</span></span>
                      {!collapsed && (chatOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton onClick={() => navigate("/admin/dashboard")} isActive={isActive("/admin/dashboard")} tooltip={t("chat.dashboard.title")} className={cn("pl-6", isActive("/admin/dashboard") ? activeItemCls : "hover:bg-sidebar-accent")}>
                            <LayoutDashboard className="h-4 w-4" /><span>Dashboard</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Workspace */}
                        {hasPermission("chat.workspace", "view") && (
                          <SidebarMenuItem>
                            <Collapsible open={workspaceOpen} onOpenChange={handleWorkspaceOpen}>
                              <div className="flex items-center pl-6" onClick={(e) => e.stopPropagation()}>
                                <SidebarMenuButton
                                  onClick={(e) => { e.stopPropagation(); navigate("/admin/workspace"); }}
                                  isActive={location.pathname === "/admin/workspace"}
                                  tooltip={t("chat.workspace.station")}
                                  className={cn("flex-1", location.pathname === "/admin/workspace" ? activeItemCls : "hover:bg-sidebar-accent")}
                                >
                                  <Inbox className="h-4 w-4" />
                                  <span>{t("chat.workspace.station")}</span>
                                  <Badge variant="accent" className="ml-auto text-[10px] min-w-[18px] h-4 px-1 text-center">{totalActiveChats}</Badge>
                                </SidebarMenuButton>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); handleWorkspaceOpen(!workspaceOpen); }}>
                                  {workspaceOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </Button>
                              </div>
                              <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                                <SidebarMenuItem>
                                  <SidebarMenuButton
                                    onClick={(e) => { e.stopPropagation(); navigate("/admin/workspace?queue=unassigned"); }}
                                    isActive={location.search.includes("queue=unassigned")}
                                    tooltip="Não Atribuído"
                                    className="pl-10 text-xs hover:bg-sidebar-accent"
                                  >
                                    <Inbox className="h-3.5 w-3.5" />
                                    <span className="truncate">Não Atribuído</span>
                                    {unassignedCount > 0 && <Badge variant="destructive" className="ml-auto text-[10px] min-w-[18px] h-4 px-1 text-center">{unassignedCount}</Badge>}
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                {teamAttendants.map((att) => (
                                  <SidebarMenuItem key={att.id}>
                                    <SidebarMenuButton
                                      onClick={(e) => { e.stopPropagation(); att.user_id === user?.id ? navigate("/admin/workspace") : navigate(`/admin/workspace?attendant=${att.id}`); }}
                                      isActive={att.user_id === user?.id ? location.pathname === "/admin/workspace" && !location.search.includes("attendant=") && !location.search.includes("queue=") : location.search.includes(`attendant=${att.id}`)}
                                      tooltip={att.display_name}
                                      className="pl-10 text-xs hover:bg-sidebar-accent"
                                    >
                                      <span className={`h-2 w-2 rounded-full shrink-0 ${att.status === "online" ? "bg-green-500" : att.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                                      <span className="truncate">{att.user_id === user?.id ? `${t("chat.workspace.you")} ${att.display_name}` : att.display_name}</span>
                                      <Badge variant="accent" className="ml-auto text-[10px] min-w-[18px] h-4 px-1 text-center">{att.active_count}</Badge>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}

                                {/* Other teams section */}
                                {otherTeamAttendants.length > 0 && (
                                  <Collapsible open={otherTeamsOpen} onOpenChange={handleOtherTeamsOpen}>
                                    <SidebarMenuItem>
                                      <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                          tooltip={t("chat.workspace.otherTeams")}
                                          className="pl-10 text-xs hover:bg-sidebar-accent"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Users className="h-3.5 w-3.5" />
                                          <span className="truncate font-medium">{t("chat.workspace.otherTeams")}</span>
                                          {otherTeamsTotalChats > 0 && <Badge variant="secondary" className="ml-auto text-[10px] min-w-[18px] h-4 px-1 text-center">{otherTeamsTotalChats}</Badge>}
                                          {otherTeamsOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                        </SidebarMenuButton>
                                      </CollapsibleTrigger>
                                    </SidebarMenuItem>
                                    <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                                      {otherTeamAttendants.map((att) => (
                                        <SidebarMenuItem key={att.id}>
                                          <SidebarMenuButton
                                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/workspace?attendant=${att.id}`); }}
                                            isActive={location.search.includes(`attendant=${att.id}`)}
                                            tooltip={att.display_name}
                                            className="pl-14 text-xs hover:bg-sidebar-accent"
                                          >
                                            <span className={`h-2 w-2 rounded-full shrink-0 ${att.status === "online" ? "bg-green-500" : att.status === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                                            <span className="truncate">{att.display_name}</span>
                                            <Badge variant="accent" className="ml-auto text-[10px] min-w-[18px] h-4 px-1 text-center">{att.active_count}</Badge>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      ))}
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.history", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/history")} isActive={isActive("/admin/history")} tooltip={t("chat.history.title")} className={cn("pl-6", isActive("/admin/history") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <History className="h-4 w-4" /><span>{t("chat.history.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.banners", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/banners")} isActive={isActive("/admin/banners")} tooltip="Outbound" className={cn("pl-6", isActive("/admin/banners") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Megaphone className="h-4 w-4" /><span>Outbound</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.broadcasts", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/broadcasts")} isActive={isActive("/admin/broadcasts")} tooltip={t("broadcasts.title")} className={cn("pl-6", isActive("/admin/broadcasts") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Megaphone className="h-4 w-4" /><span>{t("broadcasts.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasPermission("chat.reports", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/csat")} isActive={isActive("/admin/csat")} tooltip="CSAT" className={cn("pl-6", isActive("/admin/csat") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Star className="h-4 w-4" /><span>CSAT</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {(hasPermission("chat.settings.general", "view") || hasPermission("chat.settings.widget", "view") || hasPermission("chat.settings.macros", "view") || hasPermission("chat.settings.attendants", "view") || hasPermission("chat.settings.teams", "view") || hasPermission("chat.settings.categories", "view") || hasPermission("chat.settings.apikeys", "view") || hasPermission("chat", "manage")) && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/admin/settings")} isActive={isActive("/admin/settings") || location.pathname.startsWith("/admin/settings/")} tooltip={t("chat.settings.title")} className={cn("pl-6", isActive("/admin/settings") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Settings className="h-4 w-4" /><span>{t("chat.settings.title")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Cadastros */}
            {showContacts && (
              <SidebarGroup>
                <Collapsible open={contactsOpen} onOpenChange={handleContactsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>{t("nav.registry")}</span></span>
                      {!collapsed && (contactsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {hasPermission("contacts.companies", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/contacts")} isActive={isActive("/nps/contacts")} tooltip={t("nav.companies")} className={cn(isActive("/nps/contacts") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Building2 className="h-4 w-4" /><span>{t("nav.companies")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("contacts.people", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/people")} isActive={isActive("/nps/people")} tooltip={t("nav.people")} className={cn(isActive("/nps/people") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Users className="h-4 w-4" /><span>{t("nav.people")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Help Center */}
            {showHelp && (
              <SidebarGroup>
                <Collapsible open={helpOpen} onOpenChange={handleHelpOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /><span>{t("help.title")}</span></span>
                      {!collapsed && (helpOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {hasPermission("help.articles", "view") && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton onClick={() => navigate("/help/overview")} isActive={isActive("/help/overview")} tooltip={t("help.overview")} className={cn(isActive("/help/overview") ? activeItemCls : "hover:bg-sidebar-accent")}>
                                <BarChart3 className="h-4 w-4" /><span>{t("help.overview")}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton onClick={() => navigate("/help/articles")} isActive={isActive("/help/articles") || location.pathname.startsWith("/help/articles/")} tooltip={t("help.articles")} className={cn(isActive("/help/articles") || location.pathname.startsWith("/help/articles/") ? activeItemCls : "hover:bg-sidebar-accent")}>
                                <FileText className="h-4 w-4" /><span>{t("help.articles")}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}
                        {hasPermission("help.collections", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/help/collections")} isActive={isActive("/help/collections")} tooltip={t("help.collections")} className={cn(isActive("/help/collections") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <FolderOpen className="h-4 w-4" /><span>{t("help.collections")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("help.settings", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/help/settings")} isActive={isActive("/help/settings")} tooltip={t("help.settings")} className={cn(isActive("/help/settings") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Settings className="h-4 w-4" /><span>{t("help.settings")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("help.import", "manage") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/help/import")} isActive={isActive("/help/import")} tooltip={t("help.import")} className={cn(isActive("/help/import") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Import className="h-4 w-4" /><span>{t("help.import")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* NPS */}
            {showNPS && (
              <SidebarGroup>
                <Collapsible open={npsOpen} onOpenChange={handleNpsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className={`${groupLabelCls} cursor-pointer hover:text-foreground/70 flex items-center justify-between w-full transition-colors`}>
                      <span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /><span>NPS</span></span>
                      {!collapsed && (npsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {hasPermission("nps.dashboard", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/dashboard")} isActive={isActive("/nps/dashboard")} tooltip={t("nav.metrics")} className={cn("pl-6", isActive("/nps/dashboard") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <BarChart3 className="h-4 w-4" /><span>{t("nav.metrics")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("nps.campaigns", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/campaigns")} isActive={isActive("/nps/campaigns")} tooltip={t("nav.surveys")} className={cn("pl-6", isActive("/nps/campaigns") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Send className="h-4 w-4" /><span>{t("nav.surveys")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {hasPermission("nps.settings", "view") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => navigate("/nps/nps-settings")} isActive={isActive("/nps/nps-settings")} tooltip={t("npsSettings.navLabel")} className={cn("pl-6", isActive("/nps/nps-settings") ? activeItemCls : "hover:bg-sidebar-accent")}>
                              <Settings className="h-4 w-4" /><span>{t("npsSettings.navLabel")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <div className="flex flex-col gap-1">
          <SidebarMenuButton
            onClick={() => navigate("/profile")}
            isActive={isActive("/profile")}
            tooltip={t("profile.title")}
            className={cn("w-full justify-start", isActive("/profile") ? activeItemCls : "hover:bg-sidebar-accent/70")}
          >
            <User className="h-4 w-4" />
            {!collapsed && <span>{t("profile.title")}</span>}
            {!collapsed && myAttendant && (
              <span className={cn(
                "ml-auto h-2 w-2 rounded-full shrink-0",
                myAttendant.status === "online" ? "bg-green-500" :
                myAttendant.status === "busy" ? "bg-amber-400" : "bg-muted-foreground/30"
              )} />
            )}
          </SidebarMenuButton>
          {hasPermission("settings", "view") && (
            <SidebarMenuButton
              onClick={() => navigate("/nps/settings")}
              isActive={isActive("/nps/settings")}
              tooltip={t("nav.config")}
              className={cn(
                "w-full justify-start",
                isActive("/nps/settings") ? activeItemCls : "hover:bg-sidebar-accent/70",
              )}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>{t("nav.config")}</span>}
            </SidebarMenuButton>
          )}
          <div className={cn("mt-1", collapsed ? "flex flex-col items-center gap-1" : "flex items-center gap-1")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="h-8 w-8 text-foreground/50 hover:text-foreground"
              title={isDark ? "Tema claro" : "Tema escuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {!collapsed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/50 hover:text-foreground">
                    <Languages className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top">
                  <DropdownMenuItem onClick={() => setLanguage("en")}>
                    {language === "en" && "✓ "}English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("pt-BR")}>
                    {language === "pt-BR" && "✓ "}Português (BR)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-foreground/50 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
