import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  ChevronDown,
  UserPlus,
  LogIn,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type AuthMode = "login" | "register";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [ensamCode, setEnsamCode] = useState("");
  const [password, setPassword] = useState("");
  const [googleError, setGoogleError] = useState("");

  const loginMutation = trpc.localAuth.login.useMutation();

  // Redirect if authenticated
  if (isAuthenticated && user) {
    const dest = (user.role === "admin" || user.role === "promo_representative") ? "/admin" : "/dashboard";
    navigate(dest);
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        ensamCode,
        password,
      });
      localStorage.setItem("local_auth_token", result.token);
      const destination = (result.user.role === "admin" || result.user.role === "promo_representative") ? "/admin" : "/dashboard";
      window.location.href = destination;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t("login.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = "/api/google/auth/start";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleAuthToken = params.get("googleAuthToken");
    if (!googleAuthToken) {
      return;
    }

    const destination = params.get("destination") || "/dashboard";
    localStorage.setItem("local_auth_token", googleAuthToken);
    window.location.href = destination;
  }, []);

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/studyam")}
          className="text-center mb-6 w-full bg-transparent border-0 hover:opacity-90 focus:outline-none"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b24760] to-[#8e3850] shadow-lg shadow-[#b24760]/30 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] font-quantify">
            Study<span className="text-[#b24760]">AM</span>
          </h1>
        </button>

        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Card */}
        <div className="glass-strong p-8">
          {mode === "login" && (
            <>
              <h2 className="text-xl font-semibold text-center text-[#1a1a2e] mb-2">
                {t("login.welcomeBack")}
              </h2>
              <p className="text-sm text-[#6b6b7b] text-center mb-6">
                {t("login.signInDesc")}
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full mb-4 rounded-full bg-[#1a1a2e] px-6 py-3 text-white font-medium hover:opacity-95 transition-all"
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-[#e5e1e3]" />
                <span className="text-xs uppercase tracking-[0.2em] text-[#8a8691]">or</span>
                <div className="h-px flex-1 bg-[#e5e1e3]" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    {t("common.ensamCode")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type="text"
                      value={ensamCode}
                      onChange={(e) => setEnsamCode(e.target.value)}
                      placeholder={t("login.enterEnsamCode")}
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    {t("common.password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("login.enterPassword")}
                      className="w-full pl-10 pr-12 py-3 glass-input text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b7b] hover:text-[#b24760]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                {googleError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {googleError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? t("login.signingIn") : t("common.signIn")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
