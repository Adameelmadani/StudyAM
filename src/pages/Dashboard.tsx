import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Menu, X,
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

  Trash2,
  Pencil,
  Check,
  Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FOLDER_COLORS, DOC_TYPE_BG_COLORS } from "@/const";
import { detectFileTypeFromUrl, detectFileTypeFromName, getEmbedUrl } from "@/lib/fileTypeDetection";
import { DocumentCard } from "@/components/DocumentCard";
import { ThumbnailCard } from "@/components/ThumbnailCard";

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

const getSemesterName = (yearName: string, semesterIndex: number) => {
  if (yearName === "1A") return semesterIndex === 1 ? "S1" : "S2";
  if (yearName === "2A") return semesterIndex === 1 ? "S3" : "S4";
  if (yearName === "3A") return semesterIndex === 1 ? "S1" : "S2";
  if (yearName === "4A") return semesterIndex === 1 ? "S3" : "S4";
  if (yearName === "5A") return "S5";
  return `Semester ${semesterIndex}`;
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
  const [expandedSemesters, setExpandedSemesters] = useState<Set<number>>(new Set([2]));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<DocType>("cours");
  const [linkFileType, setLinkFileType] = useState<"spreadsheets" | "presentation" | "file" | "video">("file");
  const [detectedFileType, setDetectedFileType] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [linkMode, setLinkMode] = useState<"url" | "file">("url");
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [moduleSemester, setModuleSemester] = useState<number>(1);
  const [moduleError, setModuleError] = useState("");
  const [moduleColor, setModuleColor] = useState(FOLDER_COLORS[0]);
  const [elementName, setElementName] = useState("");
  const [elementModule, setElementModule] = useState<number | "">("");
  const [elementError, setElementError] = useState("");
  const [elementColor, setElementColor] = useState(FOLDER_COLORS[0]);
  const [deleteModal, setDeleteModal] = useState<{
    type: "module" | "element" | "document";
    id: number;
    title: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "settings">("courses");
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editYear, setEditYear] = useState<number | "">("");
  const [editSector, setEditSector] = useState<number | "">("");
  const [settingsError, setSettingsError] = useState("");
  const [editingModule, setEditingModule] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editingElement, setEditingElement] = useState<{ id: number; name: string; color: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!authLoading && isAuthenticated && user && !user.profileComplete) {
      navigate("/complete-profile");
    }
  }, [authLoading, isAuthenticated, navigate, user]);

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
      setModuleColor(FOLDER_COLORS[0]);
      setModuleError("");
    }
  }, [showModuleModal]);

  useEffect(() => {
    if (!showElementModal) {
      setElementName("");
      setElementModule("");
      setElementColor(FOLDER_COLORS[0]);
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

  const { data: editSectors } = trpc.sector.byYear.useQuery(
    { yearId: Number(editYear) },
    { enabled: isEditingSettings && !!editYear && years?.find(y => y.id === editYear)?.hasSectors }
  );

  const createDocMutation = trpc.document.create.useMutation({
    onSuccess: () => {
      setShowLinkModal(false);
      setLinkMode("url");
      setLinkTitle("");
      setLinkUrl("");
      setLinkFile(null);
      setLinkError("");
      setDetectedFileType(null);
      setLinkFileType("file");
      if (selectedElement) {
        utils.document.list.invalidate({ elementId: selectedElement });
      }
      utils.document.recent.invalidate();
    },
    onError: (err) => {
      setLinkError(err.message || "Failed to create document.");
    },
  });

  const { data: googleDriveStatus } = trpc.googleDrive.status.useQuery(undefined, { enabled: !!(isRepresentative || isPromoRepresentative || isAdmin) });
  const connectGoogleDriveMutation = trpc.googleDrive.connectUrl.useMutation();
  const disconnectGoogleDriveMutation = trpc.googleDrive.disconnect.useMutation({
    onSuccess: () => {
      utils.googleDrive.status.invalidate();
    },
  });

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement) return;
    setLinkError("");

    try {
      if (linkMode === "url") {
        await createDocMutation.mutateAsync({
          title: linkTitle,
          url: linkUrl,
          type: linkType,
          fileType: linkFileType,
          elementId: selectedElement,
        });
        return;
      }

      if (!linkFile) {
        setLinkError("Please select a file to upload");
        return;
      }

      if (!googleDriveStatus?.connected) {
        setLinkError("Connect your Google account before uploading files");
        return;
      }

      setIsUploadingDocument(true);
      const formData = new FormData();
      formData.append("title", linkTitle);
      formData.append("type", linkType);
      formData.append("fileType", linkFileType);
      formData.append("elementId", String(selectedElement));
      formData.append("file", linkFile);

      const token = localStorage.getItem("local_auth_token");
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: token ? { "x-local-auth-token": token } : undefined,
        body: formData,
        credentials: "include",
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to upload file");
      }

      setShowLinkModal(false);
      setLinkMode("url");
      setLinkTitle("");
      setLinkUrl("");
      setLinkFile(null);
      setLinkError("");
      setDetectedFileType(null);
      setLinkFileType("file");
      if (selectedElement) {
        utils.document.list.invalidate({ elementId: selectedElement });
      }
      utils.document.recent.invalidate();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setLinkError(error.message || "Failed to add link");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      const result = await connectGoogleDriveMutation.mutateAsync();
      window.location.href = result.url;
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Failed to connect Google account");
    }
  };
  const createModuleMutation = trpc.module.create.useMutation({
    onSuccess: () => {
      setShowModuleModal(false);
      setModuleName("");
      setModuleColor(FOLDER_COLORS[0]);
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
      setElementColor(FOLDER_COLORS[0]);
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

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingSettings(false);
      setSettingsError("");
      utils.user.list.invalidate(); // If applicable
      window.location.reload();
    },
    onError: (err) => {
      setSettingsError(err.message);
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    if (!editYear && !(isRepresentative || isPromoRepresentative || isAdmin)) {
      setSettingsError(t("settings.yearRequired"));
      return;
    }

    const selectedYearData = years?.find(y => y.id === Number(editYear));
    if (selectedYearData?.hasSectors && !editSector) {
      setSettingsError(t("settings.sectorRequired"));
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: editName,
        yearId: editYear ? Number(editYear) : undefined,
        sectorId: editSector ? Number(editSector) : null,
      });
    } catch (err) {
      // Error handled by onError
    }
  };

  const startEditing = () => {
    setEditName(user?.name || "");
    setEditYear(user?.yearId || "");
    setEditSector(user?.sectorId || "");
    setIsEditingSettings(true);
  };

  const selectedYearData = years?.find((y) => y.id === selectedYear);
  const showSectorSelector = selectedYearData?.hasSectors;
  const selectedSectorData = selectedSector
    ? sectors?.find((s) => s.id === selectedSector)
    : undefined;

  const folderTypes: DocType[] = ["cours", "test", "exam", "tp", "resume"];
  const activeDocs = activeDocType
    ? elementDocs?.filter((d) => d.type === activeDocType)
    : [];
  const isGoogleDriveYoutubeUrl = (url: string) =>
    /https?:\/\/(drive|docs)\.google\.com\//i.test(url);

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

  const switchTab = (tab: "courses" | "settings") => {
    setActiveTab(tab);
    if (tab === "courses") {
      setSelectedElement(null);
      setExpandedModule(null);
      setActiveDocType(null);
    }
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
    setDetectedFileType(null);
    setLinkFileType("file");
  };

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

  useEffect(() => {
    if (linkMode !== "file") return;

    if (!linkFile) {
      setDetectedFileType(null);
      return;
    }

    const detected = detectFileTypeFromName(linkFile.name, linkFile.type);
    setDetectedFileType(detected);
    if (detected) {
      setLinkFileType(detected as any);
    }
  }, [linkFile, linkMode]);

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#b24760] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen page-bg flex flex-col md:flex-row">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <aside
        className={`sidebar fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:w-64`}
      >
        <button
          type="button"
          onClick={() => navigate("/studyam")}
          className="p-4 flex items-center gap-3 mb-6 w-full text-left bg-transparent border-0 hover:opacity-90 focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1a1a2e] font-quantify">
            Study<span className="text-[#b24760]">AM</span>
          </span>
        </button>

        <nav className="px-2 space-y-1 flex-1 overflow-y-auto">
          <button
            onClick={() => { switchTab("courses"); setSidebarOpen(false); }}
            className={`nav-item w-full ${activeTab === "courses" ? "active" : ""}`}
          >
            <BookOpen className="w-5 h-5" />
            <span>{t("dashboard.myCourses")}</span>
          </button>
          <button
            onClick={() => { switchTab("settings"); setSidebarOpen(false); }}
            className={`nav-item w-full ${activeTab === "settings" ? "active" : ""}`}
          >
            <Settings className="w-5 h-5" />
            <span>{t("common.settings")}</span>
          </button>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div id="dashboard-section" />
          {/* Header */}
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
                  {activeTab === "courses"
                    ? t("dashboard.welcomeUser", { name: user.name || "Student" })
                    : t("common.settings")}
                </h1>
                {activeTab === "courses" && (
                  <p className="text-[#6b6b7b] mt-1">
                    {t("common.year")} {selectedYearData?.name || "..."}
                    {selectedSector && sectors
                      ? `, ${sectors.find((s) => s.id === selectedSector)?.name}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          {activeTab === "courses" ? (
            <>

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
                          <ChevronRight className="w-4 h-4 rotate-180" /> {t("common.backToFolders")}
                        </button>
                        {canManageDocs && (
                          <button
                            onClick={() => openLinkModal(activeDocType)}
                            className="btn-primary flex items-center gap-2 text-sm"
                          >
                            <Link2 className="w-4 h-4" />
                            {t("dashboard.addFile")}
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
                              canDelete={canManageDocs}
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
                  {/* Semesters with Modules */}
                  {modulesList && modulesList.length > 0 ? (
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
                                          {canManageFolders && (
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
                                                    {canManageFolders && (
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
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
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
                      <p className="text-base font-medium text-[#1a1a2e]">{user.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("common.email")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">{user.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("common.ensamCode")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">{user.ensamCode || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7b] uppercase tracking-wider mb-1">{t("dashboard.academicTrack")}</p>
                      <p className="text-base font-medium text-[#1a1a2e]">
                        {years?.find(y => y.id === user.yearId)?.name || "N/A"}
                        {user.sectorId && sectors ? ` • ${sectors.find(s => s.id === user.sectorId)?.name}` : ""}
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
                      <label className="text-sm font-medium text-[#6b6b7b]">{t("common.ensamCode")}</label>
                      <div className="px-4 py-3 glass-input text-sm bg-gray-50/50 cursor-not-allowed opacity-70">
                        {user.ensamCode}
                      </div>
                      <p className="text-[10px] text-[#6b6b7b] italic">{t("settings.cannotChangeCode")}</p>
                    </div>

                    {!(isRepresentative || isPromoRepresentative || isAdmin) ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[#1a1a2e]">{t("dashboard.academicYear")}</label>
                          <select
                            value={editYear}
                            onChange={(e) => {
                              setEditYear(e.target.value ? Number(e.target.value) : "");
                              setEditSector("");
                            }}
                            className="w-full px-4 py-3 glass-input text-sm"
                            required
                          >
                            <option value="">{t("common.selectYear")}</option>
                            {years?.map((y) => (
                              <option key={y.id} value={y.id}>{y.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[#1a1a2e]">{t("common.sector")}</label>
                          <select
                            value={editSector}
                            onChange={(e) => setEditSector(e.target.value ? Number(e.target.value) : "")}
                            className="w-full px-4 py-3 glass-input text-sm"
                            disabled={!editYear || !years?.find(y => y.id === editYear)?.hasSectors}
                            required={!!editYear && !!years?.find(y => y.id === editYear)?.hasSectors}
                          >
                            <option value="">{t("common.selectSector")}</option>
                            {editSectors?.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#6b6b7b]">{t("dashboard.academicTrack")}</label>
                        <div className="px-4 py-3 glass-input text-sm bg-gray-50/50 cursor-not-allowed opacity-70">
                          {years?.find(y => y.id === user.yearId)?.name || "N/A"}
                          {user.sectorId && sectors ? ` • ${sectors.find(s => s.id === user.sectorId)?.name}` : ""}
                        </div>
                        <p className="text-[10px] text-[#6b6b7b] italic">{t("settings.repCannotChangeYear")}</p>
                      </div>
                    )}
                  </form>
                )}
              </div>
              <p className="text-xs text-[#6b6b7b] mt-4">
                {t("dashboard.repAccessDisclaimer")}
              </p>
            </div>
          )}
        </div>
      </main>

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#1a1a2e]">
                {linkMode === "url" ? t("dashboard.addDriveYoutubeUrl") : "Upload file to Drive"}
              </h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkMode("url");
                  setLinkTitle("");
                  setLinkUrl("");
                  setLinkFile(null);
                  setDetectedFileType(null);
                  setLinkError("");
                  setLinkFileType("file");
                }}
                className="p-1 rounded-lg hover:bg-[#fdf2f4]"
              >
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/70 border border-white/70">
                <button
                  type="button"
                  onClick={() => setLinkMode("url")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    linkMode === "url"
                      ? "bg-[#1a1a2e] text-white shadow-sm"
                      : "text-[#6b6b7b] hover:bg-[#f8f4f5]"
                  }`}
                >
                  Add link
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode("file")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    linkMode === "file"
                      ? "bg-[#1a1a2e] text-white shadow-sm"
                      : "text-[#6b6b7b] hover:bg-[#f8f4f5]"
                  }`}
                >
                  Upload file
                </button>
              </div>
              {linkMode === "file" && (
                <div className={`p-3 rounded-lg border text-sm ${googleDriveStatus?.connected ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                  {googleDriveStatus?.connected ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        Connected Google account: <span className="font-semibold">{googleDriveStatus.email || "unknown"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => disconnectGoogleDriveMutation.mutate()}
                        className="text-xs font-medium underline"
                        disabled={disconnectGoogleDriveMutation.isLoading}
                      >
                        {disconnectGoogleDriveMutation.isLoading ? "Disconnecting..." : "Disconnect"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>Connect your Google account to upload files into the configured Drive folder.</div>
                      <button
                        type="button"
                        onClick={handleConnectGoogleDrive}
                        className="px-3 py-2 rounded-lg bg-[#1a1a2e] text-white text-xs font-medium"
                        disabled={connectGoogleDriveMutation.isLoading}
                      >
                        {connectGoogleDriveMutation.isLoading ? "Connecting..." : "Connect Google"}
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              {linkMode === "url" ? (
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Google Drive or YouTube URL</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    placeholder="https://drive.google.com/..."
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">File to upload</label>
                  <input
                    type="file"
                    onChange={(e) => setLinkFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                    required
                  />
                  <p className="mt-2 text-xs text-[#6b6b7b]">
                    The file will be uploaded to the configured Google Drive folder, not stored on this server.
                  </p>
                </div>
              )}
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
                  onChange={(e) => setLinkFileType(e.target.value as "spreadsheets" | "presentation" | "file" | "video")}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkMode("url");
                    setLinkTitle("");
                    setLinkUrl("");
                    setLinkFile(null);
                    setDetectedFileType(null);
                    setLinkError("");
                    setLinkFileType("file");
                  }}
                  className="flex-1 btn-glass"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createDocMutation.isLoading || isUploadingDocument}
                >
                  {createDocMutation.isLoading || isUploadingDocument ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addModule")}</h3>
                  <p className="text-xs text-[#6b6b7b] mt-1">
                    {t("common.year")}: {selectedYearData?.name || t("common.selectYear")}
                    {selectedSectorData ? ` • ${selectedSectorData.name}` : ""}
                  </p>
                </div>
                <button onClick={() => setShowModuleModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
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
                    semester: moduleSemester,
                    sectorId: selectedSector ? Number(selectedSector) : undefined,
                    color: moduleColor,
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
                    className="w-full px-4 py-2.5 glass-input text-sm mb-4"
                    placeholder={t("dashboard.moduleName")}
                    required
                  />
                </div>
                {selectedYear && (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-2">{t("dashboard.semester", { defaultValue: "Semester" })}</label>
                    <select
                      value={moduleSemester}
                      onChange={(e) => setModuleSemester(Number(e.target.value))}
                      className="w-full px-4 py-2.5 glass-input text-sm"
                      required
                    >
                      <option value={1}>{getSemesterName(selectedYearData?.name || "", 1)}</option>
                      {selectedYearData?.name !== "5A" && (
                        <option value={2}>{getSemesterName(selectedYearData?.name || "", 2)}</option>
                      )}
                    </select>
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
        </div>
      )}

      {showElementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-strong w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeInUp">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e]">{t("dashboard.addElement")}</h3>
                  <p className="text-xs text-[#6b6b7b] mt-1">
                    Module:{" "}
                    {elementModule
                      ? modulesList?.find((mod) => mod.id === elementModule)?.name || "Selected module"
                      : t("dashboard.selectModule")}
                  </p>
                </div>
                <button onClick={() => setShowElementModal(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4] shrink-0">
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
                    color: elementColor,
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
            {/* Header */}
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

            {/* Preview */}
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