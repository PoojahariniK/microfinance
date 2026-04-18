import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import Groups from "@/pages/Groups";
import Loans from "@/pages/Loans";
import Collection from "@/pages/Collection";
import Pending from "@/pages/Pending";
import Reports from "@/pages/Reports";
import StaffPage from "@/pages/Staff";
import Capital from "@/pages/Capital";
import NotFound from "@/pages/NotFound";
import { Component } from "react";

// Catch any crash inside a specific route without killing the whole app
class RouteErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || "Unknown error" };
  }
  componentDidCatch(err: any, info: any) {
    console.error("[RouteErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
          <div className="text-rose-500 text-5xl">⚠️</div>
          <p className="text-sm font-black uppercase tracking-widest text-rose-600">
            Page Error
          </p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            {this.state.error}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: "" });
              window.location.reload();
            }}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/pending" element={<Pending />} />
        <Route
          path="/reports"
          element={
            <RouteErrorBoundary>
              <Reports />
            </RouteErrorBoundary>
          }
        />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/capital" element={<Capital />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
