import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  LayoutDashboard,
  Users,
  Shield,
  BookOpen,
  Activity,
  Settings,
  GraduationCap,
  LogOut,
  Search,
  Trash2,
  Pencil,
  UserPlus,
  FileText,
  BarChart3,
  FolderPlus,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowLeft,
  Link2,
  FolderOpen,
  X,
  Check,
  Video,
  Menu,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FOLDER_COLORS } from "@/const";
import { detectFileTypeFromUrl, getEmbedUrl } from "@/lib/fileTypeDetection";
import { DocumentCard } from "@/components/DocumentCard";
import { ThumbnailCard } from "@/components/ThumbnailCard";

type AdminTab = "dashboard" | "students" | "representatives" | "promo_reps" | "courses" | "activity" | "settings";
type DocType = "cours" | "exam" | "test" | "tp" | "resume";

const typeColors: Record<string, string> = {
  cours: "bg-blue-100 text-blue-700",
  exam: "bg-red-100 text-red-700",
  test: "bg-orange-100 text-orange-700",
  tp: "bg-green-100 text-green-700",
  resume: "bg-purple-100 text-purple-700",
};

const getSemesterName = (yearName: string, semesterIndex: number) => {
  if (yearName === "1A") return semesterIndex === 1 ? "S1" : "S2";
  if (yearName === "2A") return semesterIndex === 1 ? "S3" : "S4";
  if (yearName === "3A") return semesterIndex === 1 ? "S1" : "S2";
  if (yearName === "4A") return semesterIndex === 1 ? "S3" : "S4";
  if (yearName === "5A") return "S5";
  return `Semester ${semesterIndex}`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, isPromoRepresentative, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [grantEnsamCode, setGrantEnsamCode] = useState("");
  const [grantError, setGrantError] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleYear, setModuleYear] = useState<number | "">("");
  const [moduleSemester, setModuleSemester] = useState<number>(1);
  const [moduleSector, setModuleSector] = useState<number | "">("");
  const [moduleSectorsList, setModuleSectorsList] = useState<number[]>([]);
  const [moduleColor, setModuleColor] = useState(FOLDER_COLORS[0]);
  const [elementName, setElementName] = useState("");
  const [elementModule, setElementModule] = useState<number | "">("");
  const [elementColor, setElementColor] = useState(FOLDER_COLORS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSector, setSelectedSector] = useState<number | "">("");
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [expandedSemesters, setExpandedSemesters] = useState<Set<number>>(new Set([2]));
  const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    type: "module" | "element" | "document";
    id: number;
    title: string;
  } | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<DocType>("cours");
  const [linkFileType, setLinkFileType] = useState<"spreadsheets" | "presentation" | "file" | "video">("file");
  const [detectedFileType, setDetectedFileType] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [editingModule, setEditingModule] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editingElement, setEditingElement] = useState<{ id: number; name: string; color: string } | null>(null);

  const canAccess = isAdmin || isPromoRepresentative;
  const canManageCourses = isAdmin || (isPromoRepresentative && selectedYear === user?.yearId);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
    if (!authLoading && isAuthenticated && !canAccess) {
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, canAccess, navigate]);

  // Lock year for promo reps
  useEffect(() => {
    if (isPromoRepresentative && user?.yearId) {
      setSelectedYear(user.yearId);
    }
  }, [isPromoRepresentative, user]);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.user.stats.useQuery(undefined, { enabled: canAccess });
  const { data: studentsData } = trpc.user.list.useQuery(
    { role: "student", search: searchQuery || undefined, limit: 50 },
    { enabled: canAccess && activeTab === "students" }
  );
  const { data: repsData } = trpc.user.list.useQuery(
    { role: "representative", search: searchQuery || undefined, limit: 50 },
    { enabled: canAccess && activeTab === "representatives" }
  );
  const { data: promoRepsData } = trpc.user.list.useQuery(
    { role: "promo_representative", search: searchQuery || undefined, limit: 50 },
    { enabled: canAccess && activeTab === "promo_reps" }
  );
  // Get documents for selected element
  const { data: elementDocs } = trpc.document.list.useQuery(
    { elementId: selectedElement || 0 },
    { enabled: !!selectedElement }
  );

  const grantSearchValue = grantEnsamCode.trim();
  const { data: grantSearchResults, isFetching: grantSearching } = trpc.user.list.useQuery(
    { role: "student", search: grantSearchValue || undefined, limit: 5 },
    { enabled: canAccess && showGrantModal && grantSearchValue.length > 0 }
  );
  const { data: years } = trpc.year.list.useQuery();
  const { data: allSectors } = trpc.sector.list.useQuery(undefined, { enabled: canAccess });
  const { data: activityLogs } = trpc.activity.list.useQuery(
    { limit: 20 },
    { enabled: canAccess && activeTab === "activity" }
  );

  const { data: sectors } = trpc.sector.byYear.useQuery(
    { yearId: Number(selectedYear) },
    { enabled: !!selectedYear }
  );
  const { data: modulesList } = trpc.module.list.useQuery(
    { yearId: Number(selectedYear), sectorId: selectedSector ? Number(selectedSector) : undefined },
    { enabled: !!selectedYear && activeTab === "courses" }
  );
  const { data: moduleElements } = trpc.element.list.useQuery(
    { moduleId: expandedModule || 0 },
    { enabled: !!expandedModule && activeTab === "courses" }
  );

  const grantCandidate = useMemo(() => {
    if (!grantSearchValue) return null;
    return (
      grantSearchResults?.users.find(
        (u) => u.ensamCode?.toLowerCase() === grantSearchValue.toLowerCase()
      ) || null
    );
  }, [grantSearchResults, grantSearchValue]);

  const grantMutation = trpc.user.grantRepresentative.useMutation({
    onSuccess: () => {
      setShowGrantModal(false);
      setGrantEnsamCode("");
      setGrantError("");
      utils.user.list.invalidate();
      utils.user.stats.invalidate();
    },
  });
  const revokeMutation = trpc.user.revokeRepresentative.useMutation({
    onSuccess: () => { utils.user.list.invalidate(); utils.user.stats.invalidate(); },
  });
  const deleteUserMutation = trpc.user.delete.useMutation({
    onSuccess: () => { utils.user.list.invalidate(); utils.user.stats.invalidate(); setDeleteConfirm(null); },
  });
  const createModuleMutation = trpc.module.create.useMutation({
    onSuccess: () => {
      setShowModuleModal(false);
      utils.module.list.invalidate();
    },
  });
  const createElementMutation = trpc.element.create.useMutation({
    onSuccess: () => {
      setShowElementModal(false);
      utils.element.list.invalidate();
    },
  });

  const updateModuleMutation = trpc.module.update.useMutation({
    onSuccess: () => {
      setEditingModule(null);
      utils.module.list.invalidate();
    },
  });

  const updateElementMutation = trpc.element.update.useMutation({
    onSuccess: () => {
      setEditingElement(null);
      utils.element.list.invalidate();
    },
  });

  const createDocMutation = trpc.document.create.useMutation({
    onSuccess: () => {
      setShowLinkModal(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkError("");
      setDetectedFileType(null);
      setLinkFileType("file");
      if (selectedElement) {
        utils.document.list.invalidate({ elementId: selectedElement });
      }
      utils.document.recent.invalidate();
    },
  });

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement) return;
    setLinkError("");

    try {
      await createDocMutation.mutateAsync({
        title: linkTitle,
        url: linkUrl,
        type: linkType,
        fileType: linkFileType,
        elementId: selectedElement,
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setLinkError(error.message || "Failed to add link");
    }
  };

  const isGoogleDriveYoutubeUrl = (url: string) =>
    /https?:\/\/(drive|docs)\.google\.com\//i.test(url);

  useEffect(() => {
    if (linkUrl) {
      const detected = detectFileTypeFromUrl(linkUrl);
      setDetectedFileType(detected);
      if (detected && (isGoogleDriveYoutubeUrl(linkUrl) || detected === "video")) {
        setLinkFileType(detected as any);
      }
    } else {
      setDetectedFileType(null);
    }
  }, [linkUrl]);

  const deleteModuleMutation = trpc.module.delete.useMutation({
    onSuccess: () => {
      setDeleteModal(null);
      utils.module.list.invalidate();
    },
  });

  const deleteElementMutation = trpc.element.delete.useMutation({
    onSuccess: () => {
      setDeleteModal(null);
      utils.element.list.invalidate();
    },
  });

  const deleteDocMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      setDeleteModal(null);
      if (selectedElement) {
        utils.document.list.invalidate({ elementId: selectedElement });
      }
      utils.document.recent.invalidate();
    },
  });

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingSettings(false);
      setSettingsError("");
      window.location.reload();
    },
    onError: (err) => {
      setSettingsError(err.message);
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    try {
      await updateProfileMutation.mutateAsync({
        name: editName,
        email: editEmail,
      });
    } catch (err) {
      // Error handled by onError
    }
  };

  const startEditing = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setIsEditingSettings(true);
  };

  useEffect(() => {
    if (!showGrantModal) {
      setGrantEnsamCode("");
      setGrantError("");
    }
  }, [showGrantModal]);

  const [grantRole, setGrantRole] = useState<"representative" | "promo_representative">("representative");

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    setGrantError("");
    if (!grantCandidate) {
      setGrantError(t("admin.noStudentFound"));
      return;
    }
    if (!grantCandidate.yearId) {
      setGrantError(t("admin.missingYear"));
      return;
    }
    grantMutation.mutate({
      userId: grantCandidate.id,
      yearId: grantCandidate.yearId,
      sectorId: grantCandidate.sectorId || undefined,
      role: grantRole,
    });
  };

  const toggleModule = (modId: number) => {
    setExpandedModule(expandedModule === modId ? null : modId);
    setSelectedElement(null);
    setActiveDocType(null);
  };

  const toggleSemester = (sem: number) => {
    setExpandedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) {
        next.delete(sem);
      } else {
        next.add(sem);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!selectedElement) {
      setActiveDocType(null);
    }
  }, [selectedElement]);

  const folderTypes: DocType[] = ["cours", "test", "exam", "tp", "resume"];
  const activeDocs = activeDocType
    ? elementDocs?.filter((d) => d.type === activeDocType)
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#b24760] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!canAccess) return null;

  const navItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: t("common.dashboard"), icon: LayoutDashboard },
    { id: "students", label: t("admin.students"), icon: Users },
    { id: "representatives", label: t("admin.representatives"), icon: Shield },
    ...(isAdmin ? [{ id: "promo_reps" as const, label: t("Promo Reps"), icon: Shield }] : []),
    { id: "courses", label: t("admin.courses"), icon: BookOpen },
    { id: "activity", label: t("admin.activity"), icon: Activity },
    { id: "settings", label: t("common.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen page-bg flex flex-col md:flex-row">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:w-64`}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="p-4 flex items-center gap-3 mb-6 w-full text-left bg-transparent border-0 hover:opacity-90 focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1a1a2e] font-quantify">
            Study<span className="text-[#b24760]">AM</span>
          </span>
        </button>

        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-[#6b6b7b] uppercase tracking-wider px-2">
            {t("admin.panel")}
          </span>
        </div>

        <nav className="px-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`nav-item w-full ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4">
          <button
            onClick={logout}
            className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            <span>{t("common.logout")}</span>
          </button>
          <div className="mt-3 pt-3 border-t border-[#f5d0d8]">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center text-white text-sm font-bold font-quantify">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a2e]">{user?.name}</p>
                <p className="text-xs text-[#6b6b7b]">
                  {isAdmin ? t("admin.administrator") : t("admin.promoRepresentative")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="md:hidden p-2 rounded-lg hover:bg-[#fdf2f4] text-[#b24760] transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="text-3xl font-bold text-[#1a1a2e]">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h1>
                <p className="text-[#6b6b7b] mt-1">
                  {t("admin.managePlatform")}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && stats && (
            <>
              {/* Stats Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalStudents}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">{t("admin.totalStudents")}</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalRepresentatives}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">{t("admin.representatives")}</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalElements}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">{t("admin.courseElements")}</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalDocuments}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">{t("admin.documents")}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">{t("admin.quickActions")}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => { setActiveTab("representatives"); setShowGrantModal(true); }}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <Shield className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">{t("admin.grantRepAccess")}</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">{t("admin.approveRep")}</p>
                </button>
                <button
                  onClick={() => { setActiveTab("courses"); setShowModuleModal(true); }}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <FolderPlus className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">{t("dashboard.addModule")}</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">{t("admin.createNewModule")}</p>
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <BarChart3 className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">{t("admin.viewActivity")}</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">{t("admin.monitorActivity")}</p>
                </button>
              </div>
            </>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("admin.searchStudents")}
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-sm"
                  />
                </div>
              </div>

              <div className="glass-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full">
                    <thead>
                      <tr className="border-b border-[#f5d0d8]">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.name")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.ensamCode")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.email")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.year")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.sector")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsData?.users.map((u) => (
                        <tr key={u.id} className="border-b border-[#f5d0d8]/50 hover:bg-[#fdf2f4]/30">
                          <td className="px-6 py-4 text-sm text-[#1a1a2e] font-medium">{u.name}</td>
                          <td className="px-6 py-4 text-sm text-[#6b6b7b]">{u.ensamCode}</td>
                          <td className="px-6 py-4 text-sm text-[#6b6b7b]">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full bg-[#fdf2f4] text-[#b24760] text-xs font-medium">
                              {years?.find((y) => y.id === u.yearId)?.name || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.sectorId ? (
                              <span className="px-2 py-1 rounded-full bg-[#f5f3ff] text-[#6b21a8] text-xs font-medium">
                                {allSectors?.find((s) => s.id === u.sectorId)?.name || "N/A"}
                              </span>
                            ) : (
                              <span className="text-[#6b6b7b] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setGrantEnsamCode(u.ensamCode || "");
                                  setShowGrantModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-[#fdf2f4] text-[#b24760]"
                                title={t("admin.grantRepAccess")}
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                title={t("common.delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {studentsData?.users.length === 0 && (
                  <div className="p-8 text-center text-[#6b6b7b]">{t("admin.noStudentsFound")}</div>
                )}
              </div>
            </>
          )}

          {/* Représentants Tab */}
          {activeTab === "representatives" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("admin.searchReps")}
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    setGrantRole("representative");
                    setShowGrantModal(true);
                  }}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  {t("admin.grantAccess")}
                </button>
              </div>

              <div className="glass-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full">
                    <thead>
                      <tr className="border-b border-[#f5d0d8]">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.name")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.ensamCode")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.year")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.sector")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.status")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repsData?.users.map((u) => (
                        <tr key={u.id} className="border-b border-[#f5d0d8]/50 hover:bg-[#fdf2f4]/30">
                          <td className="px-6 py-4 text-sm text-[#1a1a2e] font-medium">{u.name}</td>
                          <td className="px-6 py-4 text-sm text-[#6b6b7b]">{u.ensamCode}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full bg-[#fdf2f4] text-[#b24760] text-xs font-medium">
                              {years?.find((y) => y.id === u.yearId)?.name || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.sectorId ? (
                              <span className="px-2 py-1 rounded-full bg-[#f5f3ff] text-[#6b21a8] text-xs font-medium">
                                {allSectors?.find((s) => s.id === u.sectorId)?.name || "N/A"}
                              </span>
                            ) : (
                              <span className="text-[#6b6b7b] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isApproved
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                              }`}>
                              {u.isApproved ? t("common.active") : t("common.pending")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => revokeMutation.mutate({ userId: u.id })}
                                className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600"
                                title={t("admin.revoke")}
                              >
                                <Shield className="w-4 h-4 rotate-180" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                title={t("common.delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {repsData?.users.length === 0 && (
                  <div className="p-8 text-center text-[#6b6b7b]">{t("admin.noRepsFound")}</div>
                )}
              </div>
            </>
          )}

          {/* Promo Reps Tab */}
          {activeTab === "promo_reps" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("admin.searchReps")}
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-sm"
                  />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setGrantRole("promo_representative");
                      setShowGrantModal(true);
                    }}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t("admin.grantAccess")}
                  </button>
                )}
              </div>

              <div className="glass-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full">
                    <thead>
                      <tr className="border-b border-[#f5d0d8]">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.name")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.ensamCode")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.year")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.sector")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.status")}</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoRepsData?.users.map((u) => (
                        <tr key={u.id} className="border-b border-[#f5d0d8]/50 hover:bg-[#fdf2f4]/30">
                          <td className="px-6 py-4 text-sm text-[#1a1a2e] font-medium">{u.name}</td>
                          <td className="px-6 py-4 text-sm text-[#6b6b7b]">{u.ensamCode}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                              {years?.find((y) => y.id === u.yearId)?.name || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.sectorId ? (
                              <span className="px-2 py-1 rounded-full bg-[#f5f3ff] text-[#6b21a8] text-xs font-medium">
                                {allSectors?.find((s) => s.id === u.sectorId)?.name || "N/A"}
                              </span>
                            ) : (
                              <span className="text-[#6b6b7b] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isApproved
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                              }`}>
                              {u.isApproved ? t("common.active") : t("common.pending")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => revokeMutation.mutate({ userId: u.id })}
                                className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600"
                                title={t("admin.revoke")}
                              >
                                <Shield className="w-4 h-4 rotate-180" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                title={t("common.delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {promoRepsData?.users.length === 0 && (
                  <div className="p-8 text-center text-[#6b6b7b]">{t("admin.noRepsFound")}</div>
                )}
              </div>
            </>
          )}

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <>
              {/* Selectors */}
              <div className="glass-strong p-6 mb-8">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      {t("dashboard.academicYear")}
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value ? Number(e.target.value) : "");
                        setSelectedSector("");
                        setExpandedModule(null);
                        setSelectedElement(null);
                      }}
                      className="px-4 py-2.5 glass-input text-sm min-w-[160px]"
                    >
                      <option value="">{t("common.selectYear")}</option>
                      {years?.map((y) => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedYear && years?.find(y => y.id === selectedYear)?.hasSectors && (
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                        {t("common.sector")}
                      </label>
                      <select
                        value={selectedSector}
                        onChange={(e) => {
                          setSelectedSector(e.target.value ? Number(e.target.value) : "");
                          setExpandedModule(null);
                          setSelectedElement(null);
                        }}
                        className="px-4 py-2.5 glass-input text-sm min-w-[200px]"
                      >
                        <option value="">{t("common.selectSector")}</option>
                        {sectors?.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {canManageCourses && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                  <button
                    onClick={() => {
                      setModuleYear(selectedYear);
                      setModuleSector(selectedSector);
                      setShowModuleModal(true);
                    }}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                    disabled={!selectedYear}
                  >
                    <FolderPlus className="w-4 h-4" />
                    {t("dashboard.addModule")}
                  </button>
                  <button
                    onClick={() => {
                      setElementModule(expandedModule ?? "");
                      setShowElementModal(true);
                    }}
                    className="btn-glass flex items-center gap-2 text-sm disabled:opacity-50"
                    disabled={!modulesList || modulesList.length === 0}
                  >
                    <FileText className="w-4 h-4" />
                    {t("dashboard.addElement")}
                  </button>
                </div>
              )}
              {/* Courses Content */}
              {selectedElement ? (
                <div className="animate-fadeInUp">
                  <button
                    onClick={() => {
                      setSelectedElement(null);
                      setActiveDocType(null);
                    }}
                    className="flex items-center gap-1 text-sm text-[#b24760] mb-4 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("common.backToModules")}
                  </button>

                  <div className="glass-strong p-6 mb-6">
                    <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
                      {moduleElements?.find((e) => e.id === selectedElement)?.name}
                    </h2>
                    <p className="text-sm text-[#6b6b7b]">
                      {t("dashboard.docsAvailable", { count: elementDocs?.length || 0 })}
                    </p>
                  </div>

                  {!activeDocType ? (
                    <>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {folderTypes.map((type) => {
                          const count = elementDocs?.filter((d) => d.type === type).length || 0;
                          const colorMap: Record<string, string> = {
                            cours: "#3498db",
                            exam: "#e74c3c",
                            test: "#f39c12",
                            tp: "#2ecc71",
                            resume: "#9b59b6",
                          };
                          const typeColor = colorMap[type];
                          return (
                            <button
                              key={type}
                              onClick={() => setActiveDocType(type)}
                              className="glass-strong p-4 text-left hover:shadow-lg transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{
                                    backgroundColor: typeColor + "20",
                                  }}
                                >
                                  <Folder
                                    className="w-5 h-5"
                                    style={{ color: typeColor }}
                                  />
                                </div>
                                <div>
                                  <p className="font-medium text-[#1a1a2e]">
                                    {t(`types.${type}`)}
                                  </p>
                                  <p className="text-xs text-[#6b6b7b]">
                                    {count} {count === 1 ? t("common.item") : t("common.items")}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#6b6b7b]">
                        {t("dashboard.selectFolderDesc")}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <button
                          onClick={() => setActiveDocType(null)}
                          className="flex items-center gap-1 text-sm text-[#b24760] hover:underline"
                        >
                          <ArrowLeft className="w-4 h-4 rotate-180" /> {t("common.backToFolders")}
                        </button>
                        {canManageCourses && (
                          <button
                            onClick={() => {
                              setLinkType(activeDocType);
                              setLinkError("");
                              setShowLinkModal(true);
                            }}
                            className="btn-primary flex items-center gap-2 text-sm"
                          >
                            <Link2 className="w-4 h-4" />
                            {t("dashboard.addDriveYoutubeUrl")}
                          </button>
                        )}
                      </div>

                      {activeDocs && activeDocs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {activeDocs.map((doc) => (
                            <ThumbnailCard
                              key={doc.id}
                              id={doc.id}
                              title={doc.title}
                              type={doc.type}
                              url={doc.url}
                              createdAt={doc.createdAt}
                              fileType={doc.fileType}
                              typeColors={typeColors}
                              typeLabel={t(`types.${doc.type}`)}
                              onClick={() => {
                                const embedUrl = getEmbedUrl(doc.url);
                                if (embedUrl) {
                                  setPreviewFile({
                                    url: embedUrl,
                                    title: doc.title,
                                  });
                                } else {
                                  window.open(doc.url, "_blank");
                                }
                              }}
                              onDelete={() =>
                                setDeleteModal({
                                  type: "document",
                                  id: doc.id,
                                  title: doc.title,
                                })
                              }
                              canDelete={canManageCourses}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="glass-strong p-12 text-center">
                          <FolderOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                          <p className="text-[#6b6b7b]">
                            {t("dashboard.noDocsYet", { type: t(`types.${activeDocType}`).toLowerCase() })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Modules List */}
                  {selectedYear ? (
                    modulesList && modulesList.length > 0 ? (
                      <div className="space-y-4 mb-10">
                        {[1, 2].map((sem) => {
                          const semModules = modulesList.filter(m => m.semester === sem);
                          const yearName = years?.find(y => y.id === selectedYear)?.name || "";
                          if (yearName === "5A" && sem === 2) return null;
                          const isSemesterExpanded = expandedSemesters.has(sem);

                          return (
                            <div key={sem} className="glass-strong min-w-0 overflow-hidden">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleSemester(sem)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleSemester(sem);
                                  }
                                }}
                                className="w-full p-5 flex flex-col gap-4 text-left hover:bg-[#fdf2f4]/50 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex min-w-0 items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center">
                                    <Folder className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-semibold text-[#1a1a2e]">
                                      {getSemesterName(yearName, sem)}
                                    </h3>
                                    <p className="text-sm text-[#6b6b7b]">
                                      {semModules.length} {semModules.length === 1 ? t("common.module") : t("common.modules")}
                                    </p>
                                  </div>
                                </div>
                                <ChevronDown
                                  className={`w-5 h-5 text-[#6b6b7b] transition-transform ${isSemesterExpanded ? "rotate-180" : ""
                                    }`}
                                />
                              </div>

                              {isSemesterExpanded && (
                                <div className="border-t border-[#f5d0d8] p-5 space-y-4 animate-fadeInUp">
                                  {semModules.length > 0 ? (
                                    semModules.map((mod) => (
                                      <div key={mod.id} className="glass-strong min-w-0 overflow-hidden">
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => toggleModule(mod.id)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              toggleModule(mod.id);
                                            }
                                          }}
                                          className="w-full p-5 flex flex-col gap-4 text-left hover:bg-[#fdf2f4]/50 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex min-w-0 items-center gap-4">
                                            <div
                                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                                              style={{
                                                backgroundColor: mod.color || "#b24760"
                                              }}
                                            >
                                              <Folder className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                              <h3 className="font-semibold text-[#1a1a2e]">
                                                {mod.name}
                                              </h3>
                                              <p className="text-sm text-[#6b6b7b] break-words">
                                                {mod.description || t("dashboard.openFolder")}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                            <span className="px-3 py-1 rounded-full bg-[#fdf2f4] text-[#b24760] text-xs font-medium whitespace-nowrap">
                                              {moduleElements && expandedModule === mod.id
                                                ? t("dashboard.elementsCount", { count: moduleElements.length })
                                                : t("dashboard.openFolder")}
                                            </span>
                                            <ChevronDown
                                              className={`w-5 h-5 text-[#6b6b7b] transition-transform ${expandedModule === mod.id ? "rotate-180" : ""
                                                }`}
                                            />
                                            {canManageCourses && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingModule({ id: mod.id, name: mod.name, color: mod.color || "#b24760" });
                                                  }}
                                                  className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title={t("common.edit")}
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteModal({
                                                      type: "module",
                                                      id: mod.id,
                                                      title: mod.name,
                                                    });
                                                  }}
                                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {expandedModule === mod.id && moduleElements && (
                                          <div className="border-t border-[#f5d0d8] p-5 animate-fadeInUp">
                                            {moduleElements.length > 0 ? (
                                              <div className="grid sm:grid-cols-2 gap-3">
                                                {moduleElements.map((el) => (
                                                  <div
                                                    key={el.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => setSelectedElement(el.id)}
                                                    className="p-4 rounded-xl border border-[#f5d0d8] hover:border-[#b24760] hover:bg-[#fdf2f4] transition-all text-left cursor-pointer"
                                                  >
                                                    <div className="flex items-center justify-between gap-3">
                                                      <div className="flex items-center gap-3">
                                                        <div
                                                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                          style={{
                                                            backgroundColor: (el.color || "#b24760") + "20",
                                                          }}
                                                        >
                                                          <Folder
                                                            className="w-4 h-4"
                                                            style={{ color: el.color || "#b24760" }}
                                                          />
                                                        </div>
                                                        <div>
                                                          <h4 className="font-medium text-[#1a1a2e] mb-0.5">
                                                            {el.name}
                                                          </h4>
                                                          <p className="text-xs text-[#6b6b7b]">
                                                            {el.description || t("dashboard.openFolder")}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      {canManageCourses && (
                                                        <div className="flex items-center gap-1">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setEditingElement({ id: el.id, name: el.name, color: el.color || "#b24760" });
                                                            }}
                                                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title={t("common.edit")}
                                                          >
                                                            <Pencil className="w-4 h-4" />
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setDeleteModal({
                                                                type: "element",
                                                                id: el.id,
                                                                title: el.name,
                                                              });
                                                            }}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                          >
                                                            <Trash2 className="w-4 h-4" />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-[#6b6b7b] text-center py-4">
                                                {t("dashboard.noModules")}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-[#6b6b7b] text-center py-4">
                                      {t("dashboard.noModulesInSemester", { defaultValue: "No modules yet." })}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glass-strong p-12 text-center mb-10">
                        <FolderOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                        <p className="text-[#6b6b7b] mb-1">{t("dashboard.noModules")}</p>
                        <p className="text-sm text-[#6b6b7b]/60">
                          {t("dashboard.noModulesDesc")}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="glass-strong p-12 text-center mb-10">
                      <BookOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                      <p className="text-[#6b6b7b] mb-1">{t("dashboard.selectYearPrompt")}</p>
                      <p className="text-sm text-[#6b6b7b]/60">
                        {t("dashboard.selectYearDesc")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              {activityLogs?.map((log) => (
                <div
                  key={log.id}
                  className="glass-strong p-4 flex items-start gap-4 border-l-4 border-l-[#b24760]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#fdf2f4] flex items-center justify-center shrink-0 mt-0.5">
                    {(log.action === "upload" || log.action === "add_module" || log.action === "add_element") && <UploadCloud className="w-4 h-4 text-green-600" />}
                    {(log.action === "edit" || log.action === "edit_module" || log.action === "edit_element" || log.action === "edit_document") && <Pencil className="w-4 h-4 text-blue-600" />}
                    {(log.action === "delete" || log.action === "delete_module" || log.action === "delete_element" || log.action === "delete_document" || log.action === "delete_student") && <Trash2 className="w-4 h-4 text-red-600" />}
                    {log.action === "grant_access" && <Shield className="w-4 h-4 text-[#b24760]" />}
                    {log.action === "revoke_access" && <Shield className="w-4 h-4 text-orange-600" />}
                    {!["upload", "edit", "delete", "grant_access", "revoke_access", "add_module", "add_element", "edit_module", "edit_element", "edit_document", "delete_module", "delete_element", "delete_document", "delete_student"].includes(log.action) && (
                      <Activity className="w-4 h-4 text-[#b24760]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#1a1a2e]">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#6b6b7b]">{log.performerName}</span>
                      <span className="text-xs text-[#6b6b7b]/60">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {activityLogs?.length === 0 && (
                <div className="glass-strong p-8 text-center text-[#6b6b7b]">
                  {t("admin.noActivity")}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="animate-fadeInUp">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#1a1a2e]">{t("common.settings")}</h2>
                {!isEditingSettings ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 text-sm text-[#b24760] hover:underline"
                  >
                    <Pencil className="w-4 h-4" />
                    {t("common.edit")}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsEditingSettings(false)}
                      className="text-sm text-[#6b6b7b] hover:underline"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={updateProfileMutation.isLoading}
                      className="flex items-center gap-2 text-sm text-green-600 hover:underline font-medium"
                    >
                      <Check className="w-4 h-4" />
                      {updateProfileMutation.isLoading ? t("common.loading") : t("common.save")}
                    </button>
                  </div>
                )}
              </div>

              {settingsError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {settingsError}
                </div>
              )}

              <div className="glass-strong p-8">
                {!isEditingSettings ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("common.fullName")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">{user?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("common.email")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">{user?.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("common.ensamCode")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">{user?.ensamCode || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("dashboard.academicTrack")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">
                        {years?.find(y => y.id === user?.yearId)?.name || "N/A"}
                        {user?.sectorId && sectors ? ` • ${sectors.find(s => s.id === user.sectorId)?.name}` : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#1a1a2e]">{t("common.fullName")}</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 glass-input text-sm"
                        placeholder={t("common.fullName")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#1a1a2e]">{t("common.email")}</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-4 py-3 glass-input text-sm"
                        placeholder={t("common.email")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#6b6b7b]">{t("common.ensamCode")}</label>
                      <div className="px-4 py-3 glass-input text-sm bg-gray-50/50 cursor-not-allowed opacity-70">
                        {user?.ensamCode}
                      </div>
                      <p className="text-[10px] text-[#6b6b7b] italic">{t("settings.cannotChangeCode")}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#6b6b7b]">{t("dashboard.academicTrack")}</label>
                      <div className="px-4 py-3 glass-input text-sm bg-gray-50/50 cursor-not-allowed opacity-70">
                        {years?.find(y => y.id === user?.yearId)?.name || "N/A"}
                        {user?.sectorId && sectors ? ` • ${sectors.find(s => s.id === user.sectorId)?.name}` : ""}
                      </div>
                      <p className="text-[10px] text-[#6b6b7b] italic">
                        {isAdmin ? t("settings.adminCannotChangeYear") : t("settings.repCannotChangeYear")}
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
              {t("admin.grantRepAccess")}
            </h3>
            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("admin.studentEnsamCode")}</label>
                <input
                  type="text"
                  value={grantEnsamCode}
                  onChange={(e) => setGrantEnsamCode(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder={t("admin.searchPrompt")}
                  required
                />
                {grantSearching && (
                  <p className="text-xs text-[#6b6b7b] mt-2">{t("admin.searching")}</p>
                )}
                {!grantSearching && grantEnsamCode && !grantCandidate && (
                  <p className="text-xs text-red-600 mt-2">
                    {t("admin.noStudentFound")}
                  </p>
                )}
                {grantCandidate && (
                  <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                    <p className="font-medium">
                      {t("admin.found")}: {grantCandidate.name} ({grantCandidate.ensamCode})
                    </p>
                    <p className="mt-1">
                      {t("common.year")}: {years?.find((y) => y.id === grantCandidate.yearId)?.name || "N/A"}
                      {grantCandidate.sectorId ? ` • Sector ID ${grantCandidate.sectorId}` : ""}
                    </p>
                  </div>
                )}
                {grantCandidate && isAdmin && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("admin.selectRole")}</label>
                    <select
                      value={grantRole}
                      onChange={(e) => setGrantRole(e.target.value as any)}
                      className="w-full px-4 py-2.5 glass-input text-sm"
                    >
                      <option value="representative">{t("admin.representative")}</option>
                      <option value="promo_representative">{t("admin.promoRepresentative")}</option>
                    </select>
                  </div>
                )}
              </div>
              {grantError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {grantError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="flex-1 btn-glass"
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {t("admin.grantAccess")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addModule")}</h3>
                <button onClick={() => setShowModuleModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
                  <X className="w-5 h-5 text-[#6b6b7b]" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (moduleName && moduleYear) {
                    createModuleMutation.mutate({
                      name: moduleName,
                      yearId: Number(moduleYear),
                      semester: moduleSemester,
                      sectorId: moduleSector ? Number(moduleSector) : undefined,
                      sectorIds: moduleSectorsList.length > 0 ? moduleSectorsList : undefined,
                      color: moduleColor,
                    });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.name")}</label>
                  <input
                    type="text"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.year")}</label>
                  <select
                    value={moduleYear}
                    onChange={(e) => {
                      setModuleYear(e.target.value ? Number(e.target.value) : "");
                      setModuleSector("");
                      setModuleSectorsList([]);
                    }}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                    disabled={isPromoRepresentative}
                  >
                    <option value="">{t("common.selectYear")}</option>
                    {years?.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                {moduleYear && (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.semester", { defaultValue: "Semester" })}</label>
                    <select
                      value={moduleSemester}
                      onChange={(e) => setModuleSemester(Number(e.target.value))}
                      className="w-full px-4 py-2.5 glass-input text-sm mb-4"
                      required
                    >
                      <option value={1}>{getSemesterName(years?.find(y => y.id === moduleYear)?.name || "", 1)}</option>
                      {years?.find(y => y.id === moduleYear)?.name !== "5A" && (
                        <option value={2}>{getSemesterName(years?.find(y => y.id === moduleYear)?.name || "", 2)}</option>
                      )}
                    </select>
                  </div>
                )}
                {years?.find((y) => y.id === moduleYear)?.hasSectors && sectors && (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                      {t("common.sectors")} ({t("common.optional")})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-3 glass-input rounded-xl">
                      {sectors.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-[#fdf2f4]/50 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={moduleSectorsList.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModuleSectorsList([...moduleSectorsList, s.id]);
                              } else {
                                setModuleSectorsList(moduleSectorsList.filter(id => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-[#f5d0d8] text-[#b24760] focus:ring-[#b24760]"
                          />
                          <span className="text-sm text-[#6b6b7b]">{s.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#6b6b7b] mt-2 italic">
                      {t("admin.multiSectorNotice")}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-3">Color</label>
                  <div className="grid grid-cols-10 gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setModuleColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${moduleColor === color
                          ? "ring-2 ring-offset-2 ring-[#1a1a2e]"
                          : "hover:ring-2 hover:ring-offset-2 hover:ring-[#6b6b7b]"
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModuleModal(false)}
                    className="flex-1 btn-glass"
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {t("common.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Element Modal */}
      {showElementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addElement")}</h3>
                <button onClick={() => setShowElementModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
                  <X className="w-5 h-5 text-[#6b6b7b]" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (elementName && elementModule) {
                    createElementMutation.mutate({
                      name: elementName,
                      moduleId: Number(elementModule),
                      color: elementColor,
                    });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.name")}</label>
                  <input
                    type="text"
                    value={elementName}
                    onChange={(e) => setElementName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.module")}</label>
                  <select
                    value={elementModule}
                    onChange={(e) => setElementModule(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  >
                    <option value="">{t("dashboard.selectModule")}</option>
                    {modulesList?.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-3">Color</label>
                  <div className="grid grid-cols-10 gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setElementColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${elementColor === color
                          ? "ring-2 ring-offset-2 ring-[#1a1a2e]"
                          : "hover:ring-2 hover:ring-offset-2 hover:ring-[#6b6b7b]"
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowElementModal(false)}
                    className="flex-1 btn-glass"
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {t("common.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-sm animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">{t("admin.confirmDelete")}</h3>
            <p className="text-sm text-[#6b6b7b] mb-6">
              {t("admin.deleteUserConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-glass"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => deleteUserMutation.mutate({ id: deleteConfirm })}
                className="flex-1 px-6 py-3 rounded-full font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Content Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-sm animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">{t("admin.confirmDelete")}</h3>
            <p className="text-sm text-[#6b6b7b] mb-6">
              {deleteModal.type === "module"
                ? t("delete.moduleConfirm")
                : deleteModal.type === "element"
                  ? t("delete.elementConfirm")
                  : t("delete.documentConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 btn-glass"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (deleteModal.type === "module") {
                    deleteModuleMutation.mutate({ id: deleteModal.id });
                  } else if (deleteModal.type === "element") {
                    deleteElementMutation.mutate({ id: deleteModal.id });
                  } else if (deleteModal.type === "document") {
                    deleteDocMutation.mutate({ id: deleteModal.id });
                  }
                }}
                disabled={
                  deleteModuleMutation.isLoading ||
                  deleteElementMutation.isLoading ||
                  deleteDocMutation.isLoading
                }
                className="flex-1 px-6 py-3 rounded-full font-medium text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleteModuleMutation.isLoading ||
                  deleteElementMutation.isLoading ||
                  deleteDocMutation.isLoading
                  ? t("common.loading")
                  : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md min-h-[535px] animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addDriveYoutubeUrl")}</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4]">
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.title")}</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder={t("common.title")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Google Drive Youtube URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="https://drive.google.com/..."
                  required
                />
              </div>
              {detectedFileType && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  Detected: <span className="font-semibold capitalize">{detectedFileType}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.type")}</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as DocType)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                >
                  <option value="cours">{t("types.cours")}</option>
                  <option value="exam">{t("types.exam")}</option>
                  <option value="test">{t("types.test")}</option>
                  <option value="tp">{t("types.tp")}</option>
                  <option value="resume">{t("types.resume")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">File Type</label>
                <select
                  value={linkFileType}
                  onChange={(e) => setLinkFileType(e.target.value as "spreadsheets" | "presentation" | "file")}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                >
                  <option value="spreadsheets">Spreadsheets</option>
                  <option value="presentation">Presentation</option>
                  <option value="file">File (PDF, Image, etc.)</option>
                  <option value="video">Video (YouTube, etc.)</option>
                </select>
              </div>
              {linkError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {linkError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLinkModal(false)} className="flex-1 btn-glass">
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createDocMutation.isLoading}
                >
                  {createDocMutation.isLoading ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("common.edit")} {t("common.module")}</h3>
                <button onClick={() => setEditingModule(null)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
                  <X className="w-5 h-5 text-[#6b6b7b]" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateModuleMutation.mutate({
                    id: editingModule.id,
                    name: editingModule.name,
                    color: editingModule.color,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.name")}</label>
                  <input
                    type="text"
                    value={editingModule.name}
                    onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-3">Color</label>
                  <div className="grid grid-cols-10 gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingModule({ ...editingModule, color })}
                        className={`w-8 h-8 rounded-full transition-all ${editingModule.color === color
                          ? "ring-2 ring-offset-2 ring-[#1a1a2e]"
                          : "hover:ring-2 hover:ring-offset-2 hover:ring-[#6b6b7b]"
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingModule(null)}
                    className="flex-1 btn-glass"
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("common.edit")} {t("common.element")}</h3>
                <button onClick={() => setEditingElement(null)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
                  <X className="w-5 h-5 text-[#6b6b7b]" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateElementMutation.mutate({
                    id: editingElement.id,
                    name: editingElement.name,
                    color: editingElement.color,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("common.name")}</label>
                  <input
                    type="text"
                    value={editingElement.name}
                    onChange={(e) => setEditingElement({ ...editingElement, name: e.target.value })}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-3">Color</label>
                  <div className="grid grid-cols-10 gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingElement({ ...editingElement, color })}
                        className={`w-8 h-8 rounded-full transition-all ${editingElement.color === color
                          ? "ring-2 ring-offset-2 ring-[#1a1a2e]"
                          : "hover:ring-2 hover:ring-offset-2 hover:ring-[#6b6b7b]"
                          }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingElement(null)}
                    className="flex-1 btn-glass"
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full h-[90vh] max-w-6xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#1a1a2e] truncate pr-4">
                {previewFile.title}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewFile.url}
                title={previewFile.title}
                className="w-full h-full border-0"
                allow="fullscreen"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
