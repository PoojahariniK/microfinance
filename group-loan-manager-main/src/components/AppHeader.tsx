import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-sm text-muted-foreground">
        Welcome back, <span className="font-medium text-foreground">{user?.username}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
