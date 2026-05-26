import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const utils = trpc.useUtils();
  const { data: years } = trpc.year.list.useQuery();

  const [name, setName] = useState("");
  const [ensamCode, setEnsamCode] = useState("");
  const [yearId, setYearId] = useState<number | "">("");
  const [sectorId, setSectorId] = useState<number | "">("");
  const [error, setError] = useState("");

  const selectedYear = useMemo(
    () => years?.find((year) => year.id === Number(yearId)),
    [years, yearId]
  );
  const needsSector = !!selectedYear?.hasSectors;

  const { data: sectors } = trpc.sector.byYear.useQuery(
    { yearId: Number(yearId) },
    { enabled: !!yearId }
  );

  const completeProfileMutation = trpc.user.completeProfile.useMutation({
    onSuccess: async (updatedUser) => {
      await utils.auth.me.invalidate();
      await utils.localAuth.me.invalidate();
      const destination = updatedUser?.role === "admin" || updatedUser?.role === "promo_representative" ? "/admin" : "/dashboard";
      navigate(destination, { replace: true });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEnsamCode(user.ensamCode || "");
      setYearId(user.yearId || "");
      setSectorId(user.sectorId || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!yearId) {
      setError("Select your academic year.");
      return;
    }

    if (needsSector && !sectorId) {
      setError("Select your filière.");
      return;
    }

    try {
      await completeProfileMutation.mutateAsync({
        name: name.trim() || undefined,
        ensamCode: ensamCode.trim(),
        yearId: Number(yearId),
        sectorId: needsSector ? Number(sectorId) : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete profile";
      setError(message);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-strong p-8 max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Complete your profile</h1>
        <p className="text-sm text-[#6b6b7b] mb-6">
          Google sign-in is done. Add your ENSAM code and academic information to continue.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Name</label>
            <input className="w-full px-4 py-2.5 glass-input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Code ENSAM</label>
            <input
              className="w-full px-4 py-2.5 glass-input text-sm"
              value={ensamCode}
              onChange={(e) => setEnsamCode(e.target.value)}
              placeholder="Your ENSAM code"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Year</label>
            <select
              className="w-full px-4 py-2.5 glass-input text-sm"
              value={yearId}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : "";
                setYearId(value);
                setSectorId("");
              }}
              required
            >
              <option value="">Select year</option>
              {years?.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          {needsSector && (
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Filière</label>
              <select
                className="w-full px-4 py-2.5 glass-input text-sm"
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Select filière</option>
                {sectors?.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <button type="submit" className="w-full btn-primary" disabled={completeProfileMutation.isLoading}>
            {completeProfileMutation.isLoading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}