import { useNavigate } from "react-router";
import { Calendar, GitBranch, Users, BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const dest = (user.role === "admin" || user.role === "promo_representative") ? "/admin" : "/dashboard";
      navigate(dest);
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleAuthAction = () => {
    if (isAuthenticated && user) {
      const dest = (user.role === "admin" || user.role === "promo_representative") ? "/admin" : "/dashboard";
      navigate(dest);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-transparent border-0 hover:opacity-90 focus:outline-none"
          >
            <GraduationCap className="w-8 h-8 text-[#b24760]" />
            <span className="text-xl font-bold font-quantify">
              Study<span className="text-[#b24760]">AM</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={handleAuthAction}
              className="btn-glass text-sm py-2 px-5"
            >
              {t("common.signIn")}
            </button>
            <button
              onClick={handleAuthAction}
              className="btn-primary text-sm py-2 px-5"
            >
              {t("common.getStarted")}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-[#8e3850]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          <div className="max-w-2xl animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-rose mb-6 border border-white/30">
              <BookOpen className="w-4 h-4 text-[#ffffff]" />
              <span className="text-sm font-medium text-[#ffffff]">
                {t("landing.heroTag")}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              {t("landing.heroTitle").split(',')[0]},
              <br />
              <span className="text-[#f5d0d8]">{t("landing.heroTitle").split(',')[1]}</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-lg">
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleAuthAction}
                className="btn-primary flex items-center gap-2 border border-white/30"
              >
                {t("common.getStarted")}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 rounded-full font-medium text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                {t("common.learnMore")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 page-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
              {t("landing.featuresTitle")}
            </h2>
            <p className="text-[#6b6b7b] max-w-xl mx-auto">
              {t("landing.featuresDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-strong p-8 glass-hover">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center mb-6 shadow-lg shadow-[#b24760]/20">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1a1a2e] mb-3">
                {t("landing.feature1Title")}
              </h3>
              <p className="text-[#6b6b7b] leading-relaxed">
                {t("landing.feature1Desc")}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-strong p-8 glass-hover">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center mb-6 shadow-lg shadow-[#b24760]/20">
                <GitBranch className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1a1a2e] mb-3">
                {t("landing.feature2Title")}
              </h3>
              <p className="text-[#6b6b7b] leading-relaxed">
                {t("landing.feature2Desc")}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-strong p-8 glass-hover">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center mb-6 shadow-lg shadow-[#b24760]/20">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1a1a2e] mb-3">
                {t("landing.feature3Title")}
              </h3>
              <p className="text-[#6b6b7b] leading-relaxed">
                {t("landing.feature3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 mb-4 w-full bg-transparent border-0 hover:opacity-90 focus:outline-none"
          >
            <GraduationCap className="w-6 h-6 text-[#b24760]" />
            <span className="text-xl font-bold text-white font-quantify">
              Study<span className="text-[#b24760]">AM</span>
            </span>
          </button>
          <p className="text-[#dbdbdb] text-base mb-2">
            {t("landing.footerTag")}
          </p>
          <p className="text-[#cbcbcb]/60 text-sm">
            {t("landing.footerBuiltBy")}
          </p>
        </div>
      </footer>
    </div>
  );
}
