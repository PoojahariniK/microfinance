import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, UsersRound, Banknote, Receipt,
  ClipboardList, FileText, UserCog
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Members", path: "/members", icon: Users },
  { title: "Groups", path: "/groups", icon: UsersRound },
  { title: "Loans", path: "/loans", icon: Banknote },
  { title: "Collection Entry", path: "/collection", icon: Receipt },
  { title: "Pending List", path: "/pending", icon: ClipboardList },
  { title: "Reports", path: "/reports", icon: FileText },
  { title: "Staff", path: "/staff", icon: UserCog },
];
export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 min-h-screen flex-shrink-0 flex flex-col" style={{ background: "hsl(var(--sidebar-bg))" }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <h1 className="text-base font-bold" style={{ color: "hsl(0 0% 100%)" }}>MicroFinance Pro</h1>
        <p className="text-xs" style={{ color: "hsl(var(--sidebar-fg))" }}>Loan Management</p>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
