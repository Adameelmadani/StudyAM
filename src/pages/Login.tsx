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

type AuthMode = "login" | "register";


export default function Login() {
  const navigate = useNavigate();
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
    if (user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
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
      const destination = result.user.role === "admin" ? "/admin" : "/dashboard";
      window.location.href = destination;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!yearId) {
      setError("Please select a year");
      return;
    }
    if (showSector && !sectorId) {
      setError("Please select a sector");
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
      setError(error.message || "Registration failed");
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
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            Study<span className="text-[#b24760]">AM</span>
          </h1>
        </button>

        {/* Card */}
        <div className="glass-strong p-8">
          {mode === "login" && (
            <>
              <h2 className="text-xl font-semibold text-center text-[#1a1a2e] mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-[#6b6b7b] text-center mb-6">
                Sign in to access your courses
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    ENSAM Code
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type="text"
                      value={ensamCode}
                      onChange={(e) => setEnsamCode(e.target.value)}
                      placeholder="Enter your ENSAM code"
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
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
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>


              <p className="text-center text-sm text-[#6b6b7b] mt-2">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-[#b24760] font-medium hover:underline"
                >
                  Register
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
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
                Create your student account
              </h2>
              <p className="text-sm text-[#6b6b7b]">
                Representative access is granted by admins through the dashboard.
              </p>

              <form onSubmit={handleRegister} className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 glass-input text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    Student Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your student email"
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    ENSAM Code
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                    <input
                      type="text"
                      value={ensamCode}
                      onChange={(e) => setEnsamCode(e.target.value)}
                      placeholder="Enter your ENSAM code"
                      className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-3 glass-input text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm"
                      className="w-full px-4 py-3 glass-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      Year
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
                        <option value="">Select year</option>
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
                        Sector
                      </label>
                      <div className="relative">
                        <select
                          value={sectorId}
                          onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-4 py-3 glass-input text-sm appearance-none"
                          required
                        >
                          <option value="">Select sector</option>
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
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <p className="text-center text-sm text-[#6b6b7b] mt-4">
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-[#b24760] font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
