import { useNavigate } from "react-router";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#b24760] to-[#8e3850] shadow-xl shadow-[#b24760]/30 mb-6">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-[#1a1a2e] mb-2">404</h1>
        <p className="text-lg text-[#6b6b7b] mb-8">
          {t("notFound.desc")}
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("notFound.backHome")}
        </button>
      </div>
    </div>
  );
}
