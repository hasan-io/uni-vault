import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck, GraduationCap, KeyRound,
  UserCircle, LogOut, Building2, Trophy, Award, FileText, Briefcase, ShieldCheck, DollarSign,
} from "lucide-react";

const navItems = {
  admin: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Academic Structure", url: "/admin/structure", icon: Building2 },
    { title: "Fees", url: "/admin/fees", icon: DollarSign },
  ],
  faculty: [
    { title: "Dashboard", url: "/faculty", icon: LayoutDashboard },
    { title: "Credentials", url: "/faculty/credentials", icon: KeyRound },
    { title: "Enter Marks", url: "/faculty/marks", icon: BookOpen },
    { title: "Attendance", url: "/faculty/attendance", icon: ClipboardCheck },
    { title: "Student Records", url: "/faculty/students", icon: GraduationCap },
    { title: "Verification Panel", url: "/faculty/verification", icon: ShieldCheck },
    { title: "Fees", url: "/faculty/fees", icon: DollarSign },
  ],
  student: [
    { title: "Dashboard", url: "/student", icon: LayoutDashboard },
    { title: "Academic Records", url: "/student/records", icon: BookOpen },
    { title: "Attendance", url: "/student/attendance", icon: ClipboardCheck },
    { title: "My Achievements", url: "/student/achievements", icon: Award },
    { title: "Leaderboard", url: "/student/leaderboard", icon: Trophy },
    { title: "Resume Builder", url: "/student/resume", icon: FileText },
    { title: "Portfolio", url: "/student/portfolio", icon: Briefcase },
    { title: "Fees", url: "/student/fees", icon: DollarSign },
    { title: "Profile", url: "/student/profile", icon: UserCircle },
  ],
};

function SidebarNav() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  if (!role) return null;
  const items = navItems[role] || [];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="flex flex-col h-full">
        <div className="p-4 flex items-center gap-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sidebar-foreground text-lg tracking-tight">UniVault</span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center mx-auto">
              <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[11px] tracking-widest font-medium px-4">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === `/${role}`}
                      className="rounded-xl px-3 py-2.5 text-sidebar-foreground/70 hover:bg-white/[0.08] transition-all"
                      activeClassName="!bg-sidebar-primary !text-sidebar-primary-foreground font-medium shadow-lg shadow-primary/25"
                    >
                      <item.icon className="mr-3 h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          {!collapsed && profile && (
            <div className="mb-3 px-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-sidebar-primary">{profile.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.name}</p>
                <p className="text-[11px] text-sidebar-foreground/40 capitalize">{role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.08] rounded-xl"
            onClick={() => { signOut(); navigate("/login"); }}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 gap-4 shrink-0 sticky top-0 z-10 no-print">
            <SidebarTrigger />
            <div className="flex-1" />
            <NotificationBell />
            <div className="flex items-center gap-3 pl-3 border-l border-border/50">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">{profile?.name}</span>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
