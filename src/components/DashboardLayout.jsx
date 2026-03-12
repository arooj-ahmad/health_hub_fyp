import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { AppSidebar } from "./AppSidebar";

const DashboardLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-3 md:px-6 gap-2 md:gap-4">
            <SidebarTrigger />
            <div className="flex items-center justify-between flex-1">
              <h1 className="text-base md:text-lg font-semibold text-foreground">Smart Nutrition Assistant</h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 animate-fade-in">
            {children}
          </main>
          <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-4 px-4 md:px-6">
            <p className="text-center text-xs md:text-sm text-muted-foreground">
              © 2025 developed by Arooj Ahmad
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
