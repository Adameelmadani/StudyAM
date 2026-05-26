import { useEffect, type ReactNode } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";

function ProfileGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      return;
    }

    const onCompleteProfilePage = location.pathname === "/complete-profile";
    if (!user.profileComplete && !onCompleteProfilePage) {
      navigate("/complete-profile", { replace: true });
      return;
    }

    if (user.profileComplete && onCompleteProfilePage) {
      const destination = user.role === "admin" || user.role === "promo_representative" ? "/admin" : "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate, user]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ProfileGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/studyam" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ProfileGate>
  );
}
