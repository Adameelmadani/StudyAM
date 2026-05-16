import { useState } from "react";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [yearId, setYearId] = useState<number | "">("");
  const [sectorId, setSectorId] = useState<number | "">("");

  const loginMutation = trpc.localAuth.login.useMutation();
  const registerMutation = trpc.localAuth.register.useMutation();
  const { data: years } = trpc.year.list.useQuery();
  const { data: sectors } = trpc.sector.byYear.useQuery(
    { yearId: Number(yearId) },
    { enabled: !!yearId && years?.find((y) => y.id === yearId)?.hasSectors }
  );

  const selectedYear = years?.find((y) => y.id === yearId);
  const showSector = selectedYear?.hasSectors;

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("login.passwordsDoNotMatch"));
      return;
    }
    if (!yearId) {
      setError(t("login.selectYearError"));
      return;
    }
    if (showSector && !sectorId) {
      setError(t("login.selectSectorError"));
      return;
    }

    setLoading(true);
    try {
      const result = await registerMutation.mutateAsync({
        name,
        email,
        ensamCode,
        password,
        yearId: Number(yearId),
        sectorId: sectorId ? Number(sectorId) : undefined,
      });
      localStorage.setItem("local_auth_token", result.token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t("login.registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? t("login.signingIn") : t("common.signIn")}
                </button>
              </form>


              <p className="text-center text-sm text-[#6b6b7b] mt-2">
                {t("login.noAccount")}{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-[#b24760] font-medium hover:underline"
                >
                  {t("common.register")}
                </button>
              </p>
            </>
          )}

          {mode === "register" && (
            <>
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-sm text-[#6b6b7b] hover:text-[#b24760] mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> {t("common.back")}
              </button>

              <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
                {t("login.createAccount")}
              </h2>
              <p className="text-sm text-[#6b6b7b]">
                {t("login.repAccessDesc")}
              </p>

              <form onSubmit={handleRegister} className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    {t("common.fullName")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("login.enterFullName")}
                    className="w-full px-4 py-3 glass-input text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    {t("common.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("login.enterEmail")}
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      {t("common.password")}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("common.password")}
                      className="w-full px-4 py-3 glass-input text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      {t("common.confirmPassword")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("common.confirmPassword")}
                      className="w-full px-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      {t("common.year")}
                    </label>
                    <div className="relative">
                      <select
                        value={yearId}
                        onChange={(e) => {
                          setYearId(e.target.value ? Number(e.target.value) : "");
                          setSectorId("");
                        }}
                        className="w-full px-4 py-3 glass-input text-sm appearance-none"
                        required
                      >
                        <option value="">{t("common.selectYear")}</option>
                        {years?.map((y) => (
                          <option key={y.id} value={y.id}>{y.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b] pointer-events-none" />
                    </div>
                  </div>

                  {showSector && (
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                        {t("common.sector")}
                      </label>
                      <div className="relative">
                        <select
                          value={sectorId}
                          onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-4 py-3 glass-input text-sm appearance-none"
                          required
                        >
                          <option value="">{t("common.selectSector")}</option>
                          {sectors?.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b] pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? t("login.creatingAccount") : t("common.register")}
                </button>
              </form>

              <p className="text-center text-sm text-[#6b6b7b] mt-4">
                {t("login.alreadyHaveAccount")}{" "}
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-[#b24760] font-medium hover:underline"
                >
                  {t("common.signIn")}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
