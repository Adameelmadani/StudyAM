import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GraduationCap,
  LogOut,
  ChevronDown as ChevronDownIcon,
  FolderOpen,
  Link2,
  X,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type DocType = "cours" | "exam" | "test" | "tp" | "resume";

const typeColors: Record<string, string> = {
  cours: "bg-blue-100 text-blue-700",
  exam: "bg-red-100 text-red-700",
  test: "bg-orange-100 text-orange-700",
  tp: "bg-green-100 text-green-700",
  resume: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<string, string> = {
  cours: "Cours",
  exam: "Exams",
  test: "Tests",
  tp: "TP",
  resume: "Résumé",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    isRepresentative,
    isPromoRepresentative,
    isAdmin,
    logout,
  } = useAuth();
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSector, setSelectedSector] = useState<number | "">("");
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<DocType>("cours");
  const [linkError, setLinkError] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleError, setModuleError] = useState("");
  const [elementName, setElementName] = useState("");
  const [elementModule, setElementModule] = useState<number | "">("");
  const [elementError, setElementError] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    type: "module" | "element" | "document";
    id: number;
    title: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const isYearMatch = user?.yearId === Number(selectedYear);
  const isSectorMatch = user?.sectorId === Number(selectedSector) || (!selectedSector && !user?.sectorId);

  const canManageFolders = isAdmin || (isPromoRepresentative && isYearMatch);
  const canManageDocs = canManageFolders || (isRepresentative && isYearMatch && isSectorMatch);

  // Set defaults from user
  useEffect(() => {
    if (user?.yearId && !selectedYear) {
      setSelectedYear(user.yearId);
    }
    if (user?.sectorId && !selectedSector) {
      setSelectedSector(user.sectorId);
    }
  }, [user, selectedYear, selectedSector]);

  useEffect(() => {
    if (!selectedElement) {
      setActiveDocType(null);
    }
  }, [selectedElement]);

  useEffect(() => {
    if (!showModuleModal) {
      setModuleName("");
      setModuleError("");
    }
  }, [showModuleModal]);

  useEffect(() => {
    if (!showElementModal) {
      setElementName("");
      setElementModule("");
      setElementError("");
    }
  }, [showElementModal]);

  const utils = trpc.useUtils();
  const { data: years } = trpc.year.list.useQuery();
  const { data: sectors } = trpc.sector.byYear.useQuery(
    { yearId: Number(selectedYear) },
    { enabled: !!selectedYear && years?.find((y) => y.id === selectedYear)?.hasSectors }
  );
  const { data: modulesList } = trpc.module.list.useQuery(
    { yearId: Number(selectedYear), sectorId: selectedSector ? Number(selectedSector) : undefined },
    { enabled: !!selectedYear }
  );
  const { data: recentDocs } = trpc.document.recent.useQuery(
    { yearId: Number(selectedYear), sectorId: selectedSector ? Number(selectedSector) : undefined, limit: 6 },
    { enabled: !!selectedYear }
  );

  // Get elements for expanded module
  const { data: moduleElements } = trpc.element.list.useQuery(
    { moduleId: expandedModule || 0 },
    { enabled: !!expandedModule }
  );

  // Get documents for selected element
  const { data: elementDocs } = trpc.document.list.useQuery(
    { elementId: selectedElement || 0 },
    { enabled: !!selectedElement }
  );

  const createDocMutation = trpc.document.create.useMutation({
    onSuccess: () => {
      setShowLinkModal(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkError("");
      if (selectedElement) {
        utils.document.list.invalidate({ elementId: selectedElement });
      }
      utils.document.recent.invalidate();
    },
  });
  const createModuleMutation = trpc.module.create.useMutation({
    onSuccess: () => {
      setShowModuleModal(false);
      setModuleName("");
      setModuleError("");
      utils.module.list.invalidate();
    },
    onError: (err) => {
      setModuleError(err.message || "Unable to create module.");
    },
  });
  const createElementMutation = trpc.element.create.useMutation({
    onSuccess: () => {
      setShowElementModal(false);
      setElementName("");
      setElementModule("");
      setElementError("");
      utils.element.list.invalidate();
    },
    onError: (err) => {
      setElementError(err.message || "Unable to create element.");
    },
  });

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

  const selectedYearData = years?.find((y) => y.id === selectedYear);
  const showSectorSelector = selectedYearData?.hasSectors;
  const selectedSectorData = selectedSector
    ? sectors?.find((s) => s.id === selectedSector)
    : undefined;

  const baseFolderTypes: DocType[] = ["cours", "test", "exam", "tp"];
  const folderTypes: DocType[] = elementDocs?.some((d) => d.type === "resume")
    ? [...baseFolderTypes, "resume"]
    : baseFolderTypes;
  const activeDocs = activeDocType
    ? elementDocs?.filter((d) => d.type === activeDocType)
    : [];
  const isGoogleDriveUrl = (url: string) =>
    /https?:\/\/(drive|docs)\.google\.com\//i.test(url);

  const toggleModule = (modId: number) => {
    setExpandedModule(expandedModule === modId ? null : modId);
    setSelectedElement(null);
    setActiveDocType(null);
  };

  const scrollToSection = (section: "dashboard" | "courses" | "settings") => {
    if (section === "dashboard") {
      setSelectedElement(null);
      setExpandedModule(null);
      setActiveDocType(null);
    }
    if (section === "courses") {
      setSelectedElement(null);
      setActiveDocType(null);
    }
    const targetId =
      section === "dashboard"
        ? "dashboard-section"
        : section === "courses"
        ? "courses-section"
        : "settings-section";
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openLinkModal = (type: DocType) => {
    setLinkType(type);
    setLinkError("");
    setShowLinkModal(true);
  };

  const openModuleModal = () => {
    setModuleError("");
    setShowModuleModal(true);
  };

  const openElementModal = () => {
    setElementError("");
    setElementModule(expandedModule ?? "");
    setShowElementModal(true);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkTitle("");
    setLinkUrl("");
    setLinkError("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#b24760] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen page-bg flex">
      {/* Sidebar */}
      <aside
        className={`sidebar fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="p-4 flex items-center gap-3 mb-6 w-full text-left bg-transparent border-0 hover:opacity-90 focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-[#1a1a2e]">
              Study<span className="text-[#b24760]">AM</span>
            </span>
          )}
        </button>

        <nav className="px-2 space-y-1">
          <button
            onClick={() => scrollToSection("dashboard")}
            className="nav-item active w-full"
          >
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>{t("common.dashboard")}</span>}
          </button>
          <button
            onClick={() => scrollToSection("courses")}
            className="nav-item w-full"
          >
            <BookOpen className="w-5 h-5" />
            {sidebarOpen && <span>{t("dashboard.myCourses")}</span>}
          </button>
          <button onClick={() => scrollToSection("settings")} className="nav-item w-full">
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>{t("common.settings")}</span>}
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={logout}
            className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>{t("common.logout")}</span>}
          </button>
          {sidebarOpen && (
            <div className="mt-3 pt-3 border-t border-[#f5d0d8]">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0) || "S"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-[#1a1a2e] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#6b6b7b] truncate">
                    {user.ensamCode}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-[#f5d0d8] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
        >
          {sidebarOpen ? (
            <ChevronRight className="w-3 h-3 text-[#b24760]" />
          ) : (
            <ChevronDownIcon className="w-3 h-3 text-[#b24760] rotate-90" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div id="dashboard-section" />
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a2e]">
                {t("dashboard.welcomeUser", { name: user.name || "Student" })}
              </h1>
              <p className="text-[#6b6b7b] mt-1">
                {t("common.year")} {selectedYearData?.name || "..."}
                {selectedSector && sectors
                  ? `, ${sectors.find((s) => s.id === selectedSector)?.name}`
                  : ""}
              </p>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Year & Sector Selector */}
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

              {showSectorSelector && (
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

          <div id="courses-section" />
          {selectedElement ? (
            /* Element Detail View */
            <div className="animate-fadeInUp">
              <button
                onClick={() => {
                  setSelectedElement(null);
                  setActiveDocType(null);
                }}
                className="flex items-center gap-1 text-sm text-[#b24760] mb-4 hover:underline"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> {t("common.backToModules")}
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
                      return (
                        <button
                          key={type}
                          onClick={() => setActiveDocType(type)}
                          className="glass-strong p-4 text-left hover:shadow-lg transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center">
                              <Folder className="w-5 h-5 text-[#b24760]" />
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
                      <ChevronRight className="w-4 h-4 rotate-180" /> {t("common.backToFolders")}
                    </button>
                    {canManageDocs && (
                      <button
                        onClick={() => openLinkModal(activeDocType)}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <Link2 className="w-4 h-4" />
                        {t("dashboard.addDriveUrl")}
                      </button>
                    )}
                  </div>

                  {activeDocs && activeDocs.length > 0 ? (
                    <div className="space-y-3">
                      {activeDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="glass-strong p-4 flex items-center gap-4 hover:shadow-lg transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#b24760]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[#1a1a2e] truncate">
                              {doc.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  typeColors[doc.type]
                                }`}
                              >
                                {t(`types.${doc.type}`)}
                              </span>
                              <span className="text-xs text-[#6b6b7b]">
                                {t("dashboard.by")} {doc.uploaderName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-glass text-xs py-2 px-4 shrink-0"
                            >
                              {t("common.open")}
                            </a>
                            {canManageDocs && (
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    type: "document",
                                    id: doc.id,
                                    title: doc.title,
                                  })
                                }
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
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
              {canManageFolders && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={openModuleModal}
                    className="btn-primary text-sm disabled:opacity-60"
                    disabled={!selectedYear}
                  >
                    {t("dashboard.addModule")}
                  </button>
                  <button
                    onClick={openElementModal}
                    className="btn-glass text-sm disabled:opacity-60"
                    disabled={!modulesList || modulesList.length === 0}
                  >
                    {t("dashboard.addElement")}
                  </button>
                </div>
              )}
              {/* Modules Grid */}
              {modulesList && modulesList.length > 0 ? (
                <div className="space-y-4 mb-10">
                  {modulesList.map((mod) => (
                    <div key={mod.id} className="glass-strong overflow-hidden">
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
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-[#fdf2f4]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center">
                            <Folder className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#1a1a2e]">
                              {mod.name}
                            </h3>
                            <p className="text-sm text-[#6b6b7b]">
                              {mod.description || t("dashboard.openFolder")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-[#fdf2f4] text-[#b24760] text-xs font-medium">
                            {moduleElements && expandedModule === mod.id
                              ? t("dashboard.elementsCount", { count: moduleElements.length })
                              : t("dashboard.openFolder")}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-[#6b6b7b] transition-transform ${
                              expandedModule === mod.id ? "rotate-180" : ""
                            }`}
                          />
                          {canManageFolders && (
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
                                  onClick={() => {
                                    setSelectedElement(el.id);
                                    setActiveDocType(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setSelectedElement(el.id);
                                      setActiveDocType(null);
                                    }
                                  }}
                                  className="p-4 rounded-xl border border-[#f5d0d8] hover:border-[#b24760] hover:bg-[#fdf2f4] transition-all text-left cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center">
                                        <Folder className="w-4 h-4 text-[#b24760]" />
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
                                    {canManageFolders && (
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
                  ))}
                </div>
              ) : selectedYear ? (
                <div className="glass-strong p-12 text-center mb-10">
                  <FolderOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                  <p className="text-[#6b6b7b] mb-1">{t("dashboard.noModules")}</p>
                  <p className="text-sm text-[#6b6b7b]/60">
                    {t("dashboard.noModulesDesc")}
                  </p>
                </div>
              ) : (
                <div className="glass-strong p-12 text-center mb-10">
                  <BookOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                  <p className="text-[#6b6b7b] mb-1">{t("dashboard.selectYearPrompt")}</p>
                  <p className="text-sm text-[#6b6b7b]/60">
                    {t("dashboard.selectYearDesc")}
                  </p>
                </div>
              )}

              {/* Recent Documents */}
              {recentDocs && recentDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
                    {t("dashboard.recentUploads")}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="glass-strong p-4 glass-hover cursor-pointer"
                        onClick={() => {
                          setSelectedElement(doc.elementId);
                          setActiveDocType(doc.type as DocType);
                        }}
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                            typeColors[doc.type]
                          }`}
                        >
                          {typeLabels[doc.type]}
                        </span>
                        <h4 className="font-medium text-[#1a1a2e] truncate mb-1">
                          {doc.title}
                        </h4>
                        <p className="text-xs text-[#6b6b7b]">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <section id="settings-section" className="mt-12">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">{t("common.settings")}</h3>
            <div className="glass-strong p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">{t("common.fullName")}</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.name || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">{t("common.email")}</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.email || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">{t("common.ensamCode")}</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.ensamCode || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">{t("dashboard.academicTrack")}</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">
                  {selectedYearData?.name || "N/A"}
                  {selectedSectorData ? ` • ${selectedSectorData.name}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6b6b7b] mt-3">
              {t("dashboard.repAccessDisclaimer")}
            </p>
          </section>
        </div>
      </main>

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addDriveUrl")}</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  {t("dashboard.folder")}: {t(`types.${linkType}`)}
                </p>
              </div>
              <button onClick={closeLinkModal} className="p-1 rounded-lg hover:bg-[#fdf2f4]">
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLinkError("");
                if (!selectedElement) {
                  setLinkError("Select an element folder first.");
                  return;
                }
                if (!isGoogleDriveUrl(linkUrl)) {
                  setLinkError("Please provide a Google Drive URL.");
                  return;
                }
                createDocMutation.mutate({
                  title: linkTitle,
                  type: linkType,
                  url: linkUrl,
                  elementId: selectedElement,
                });
              }}
              className="space-y-4"
            >
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
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Google Drive URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="https://drive.google.com/..."
                  required
                />
              </div>
              {linkError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {linkError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeLinkModal} className="flex-1 btn-glass">
                  {t("common.cancel")}
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {t("dashboard.saveLink")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addModule")}</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  {t("common.year")}: {selectedYearData?.name || t("common.selectYear")}
                  {selectedSectorData ? ` • ${selectedSectorData.name}` : ""}
                </p>
              </div>
              <button onClick={() => setShowModuleModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4]">
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModuleError("");
                if (!moduleName.trim()) {
                  setModuleError("Module name is required.");
                  return;
                }
                if (!selectedYear) {
                  setModuleError("Select an academic year first.");
                  return;
                }
                createModuleMutation.mutate({
                  name: moduleName.trim(),
                  yearId: Number(selectedYear),
                  sectorId: selectedSector ? Number(selectedSector) : undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.moduleName")}</label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder={t("dashboard.moduleName")}
                  required
                />
              </div>
              {moduleError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {moduleError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModuleModal(false)} className="flex-1 btn-glass">
                  {t("common.cancel")}
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showElementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addElement")}</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  Module:{" "}
                  {elementModule
                    ? modulesList?.find((mod) => mod.id === elementModule)?.name || "Selected module"
                    : t("dashboard.selectModule")}
                </p>
              </div>
              <button onClick={() => setShowElementModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4]">
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setElementError("");
                if (!elementName.trim()) {
                  setElementError("Element name is required.");
                  return;
                }
                if (!elementModule) {
                  setElementError("Select a module first.");
                  return;
                }
                createElementMutation.mutate({
                  name: elementName.trim(),
                  moduleId: Number(elementModule),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.elementName")}</label>
                <input
                  type="text"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder={t("dashboard.elementName")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.folder")}</label>
                <select
                  value={elementModule}
                  onChange={(e) => setElementModule(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                >
                  <option value="">{t("dashboard.selectModule")}</option>
                  {modulesList?.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                    </option>
                  ))}
                </select>
              </div>
              {elementError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {elementError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowElementModal(false)} className="flex-1 btn-glass">
                  {t("common.cancel")}
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    </div>
  );
}
