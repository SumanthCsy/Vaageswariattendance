import { ReactNode } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, School } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Logged out successfully"
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error logging out",
        variant: "destructive"
      });
    }
  };

  // Don't show header/footer on login page
  if (location === "/") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <School className="h-6 w-6" />
            <h1 className="text-xl font-bold">Vaageswari College of Engineering</h1>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6">
        {children}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>©All Copyrights Reserved By Vaageswari College of Engineering</p>
        <p className="mt-1">Designed & Development By @Sumanth Csy</p>
      </footer>
    </div>
  );
}