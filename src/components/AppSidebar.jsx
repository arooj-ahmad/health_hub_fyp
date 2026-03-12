import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Apple, 
  TrendingUp, 
  FileText, 
  MessageSquare,
  User,
  LogOut,
  Stethoscope,
  CalendarCheck,
  Star,
} from "lucide-react";
import { NavLink } from "./NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import { Button } from "./ui/button";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const userMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Recipes", url: "/recipes", icon: UtensilsCrossed },
  { title: "Diet Plans", url: "/diet-plans", icon: Apple },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Lab Reports", url: "/lab-reports", icon: FileText },
  { title: "AI Doctor", url: "/ai-doctor", icon: MessageSquare },
  { title: "Nutritionists", url: "/consult-nutritionist", icon: Stethoscope },
  { title: "Appointments", url: "/my-appointments", icon: CalendarCheck },
];

const nutritionistMenuItems = [
  { title: "Dashboard", url: "/nutritionist/dashboard", icon: LayoutDashboard },
  { title: "Appointments", url: "/nutritionist/dashboard?tab=appointments", icon: CalendarCheck },
  { title: "Messages", url: "/nutritionist/dashboard?tab=messages", icon: MessageSquare },
  { title: "Reviews", url: "/nutritionist/dashboard?tab=reviews", icon: Star },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userRole } = useAuth();
  const { toast } = useToast();

  const menuItems = userRole === 'nutritionist' ? nutritionistMenuItems : userMenuItems;
  const profileUrl = userRole === 'nutritionist' ? '/nutritionist/dashboard?tab=profile' : '/profile';
  const isNutritionist = userRole === 'nutritionist';

  // For nutritionist links with query params, compare full path + search
  const isLinkActive = (url) => {
    const [urlPath, urlSearch] = url.split('?');
    if (urlSearch) {
      return location.pathname === urlPath && location.search === `?${urlSearch}`;
    }
    return location.pathname === urlPath && !location.search;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/login");
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login on error
      navigate("/login");
    }
  };

  return (
    <Sidebar className={`${!open ? "w-16" : "w-64"} smooth-transition border-r border-border`}>
      <SidebarContent className="bg-sidebar">
        <div className={`p-4 border-b border-sidebar-border ${!open ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            {open && (
              <>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">H+</span>
                </div>
                <div>
                  <h2 className="font-bold text-sidebar-foreground">HealthHub</h2>
                  <p className="text-xs text-muted-foreground">Medical Platform</p>
                </div>
              </>
            )}
            {!open && (
              <div className="h-10 w-10 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">H+</span>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={!open ? 'sr-only' : ''}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {isNutritionist ? (
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg smooth-transition ${
                          isLinkActive(item.url)
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'hover:bg-sidebar-accent'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </Link>
                    ) : (
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent smooth-transition"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                {isNutritionist ? (
                  <Link
                    to={profileUrl}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg smooth-transition ${
                      isLinkActive(profileUrl)
                        ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                        : 'hover:bg-sidebar-accent'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    {open && <span>Profile</span>}
                  </Link>
                ) : (
                  <NavLink 
                    to={profileUrl} 
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent smooth-transition"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <User className="h-5 w-5" />
                    {open && <span>Profile</span>}
                  </NavLink>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                {open && <span>Logout</span>}
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
