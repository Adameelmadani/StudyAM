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
} from "lucide-react";

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
    isAdmin,
    logout,
  } = useAuth();
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

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

  const selectedYearData = years?.find((y) => y.id === selectedYear);
  const showSectorSelector = selectedYearData?.hasSectors;
  const selectedSectorData = selectedSector
    ? sectors?.find((s) => s.id === selectedSector)
    : undefined;

  const canManageDocs = isAdmin || isRepresentative;
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
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => scrollToSection("courses")}
            className="nav-item w-full"
          >
            <BookOpen className="w-5 h-5" />
            {sidebarOpen && <span>My Courses</span>}
          </button>
          <button onClick={() => scrollToSection("settings")} className="nav-item w-full">
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>Settings</span>}
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={logout}
            className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1a1a2e]">
              Welcome, {user.name || "Student"}
            </h1>
            <p className="text-[#6b6b7b] mt-1">
              Year {selectedYearData?.name || "..."}
              {selectedSector && sectors
                ? `, ${sectors.find((s) => s.id === selectedSector)?.name}`
                : ""}
            </p>
          </div>

          {/* Year & Sector Selector */}
          <div className="glass-strong p-6 mb-8">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                  Academic Year
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
                  <option value="">Select year</option>
                  {years?.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              {showSectorSelector && (
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                    Sector
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
                    <option value="">Select sector</option>
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
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to modules
              </button>

              <div className="glass-strong p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">
                  {moduleElements?.find((e) => e.id === selectedElement)?.name}
                </h2>
                <p className="text-sm text-[#6b6b7b]">
                  {elementDocs?.length || 0} document(s) available
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
                                {typeLabels[type]}
                              </p>
                              <p className="text-xs text-[#6b6b7b]">
                                {count} item{count === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#6b6b7b]">
                    Select a folder to view documents.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <button
                      onClick={() => setActiveDocType(null)}
                      className="flex items-center gap-1 text-sm text-[#b24760] hover:underline"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to folders
                    </button>
                    {canManageDocs && (
                      <button
                        onClick={() => openLinkModal(activeDocType)}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <Link2 className="w-4 h-4" />
                        Add Google Drive URL
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
                                {typeLabels[doc.type]}
                              </span>
                              <span className="text-xs text-[#6b6b7b]">
                                by {doc.uploaderName}
                              </span>
                            </div>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-glass text-xs py-2 px-4 shrink-0"
                          >
                            Open
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-strong p-12 text-center">
                      <FolderOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                      <p className="text-[#6b6b7b]">
                        No {typeLabels[activeDocType].toLowerCase()} documents yet
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {canManageDocs && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={openModuleModal}
                    className="btn-primary text-sm disabled:opacity-60"
                    disabled={!selectedYear}
                  >
                    Add Module
                  </button>
                  <button
                    onClick={openElementModal}
                    className="btn-glass text-sm disabled:opacity-60"
                    disabled={!modulesList || modulesList.length === 0}
                  >
                    Add Element
                  </button>
                </div>
              )}
              {/* Modules Grid */}
              {modulesList && modulesList.length > 0 ? (
                <div className="space-y-4 mb-10">
                  {modulesList.map((mod) => (
                    <div key={mod.id} className="glass-strong overflow-hidden">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-[#fdf2f4]/50 transition-colors"
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
                              {mod.description || "Click to view elements"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-[#fdf2f4] text-[#b24760] text-xs font-medium">
                            {moduleElements && expandedModule === mod.id
                              ? `${moduleElements.length} elements`
                              : "Open folder"}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-[#6b6b7b] transition-transform ${
                              expandedModule === mod.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {expandedModule === mod.id && moduleElements && (
                        <div className="border-t border-[#f5d0d8] p-5 animate-fadeInUp">
                          {moduleElements.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {moduleElements.map((el) => (
                                <button
                                  key={el.id}
                                  onClick={() => {
                                    setSelectedElement(el.id);
                                    setActiveDocType(null);
                                  }}
                                  className="p-4 rounded-xl border border-[#f5d0d8] hover:border-[#b24760] hover:bg-[#fdf2f4] transition-all text-left"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center">
                                      <Folder className="w-4 h-4 text-[#b24760]" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-[#1a1a2e] mb-1">
                                        {el.name}
                                      </h4>
                                      <p className="text-xs text-[#6b6b7b]">
                                        {el.description || "Open element folder"}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[#6b6b7b] text-center py-4">
                              No elements in this module yet
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
                  <p className="text-[#6b6b7b] mb-1">No modules available yet</p>
                  <p className="text-sm text-[#6b6b7b]/60">
                    Course materials will be added soon
                  </p>
                </div>
              ) : (
                <div className="glass-strong p-12 text-center mb-10">
                  <BookOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                  <p className="text-[#6b6b7b] mb-1">Select a year to browse courses</p>
                  <p className="text-sm text-[#6b6b7b]/60">
                    Choose your academic year and sector from the selector above
                  </p>
                </div>
              )}

              {/* Recent Documents */}
              {recentDocs && recentDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
                    Recent Uploads
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
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">Settings</h3>
            <div className="glass-strong p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">Full name</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.name || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">Email</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.email || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">ENSAM code</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">{user.ensamCode || "-"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6b6b7b]">Academic track</p>
                <p className="text-sm font-medium text-[#1a1a2e] break-words">
                  {selectedYearData?.name || "N/A"}
                  {selectedSectorData ? ` • ${selectedSectorData.name}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6b6b7b] mt-3">
              Representative access is granted by admins through the admin dashboard.
            </p>
          </section>
        </div>
      </main>

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Add Google Drive URL</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  Folder: {typeLabels[linkType]}
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
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Title</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="Document title"
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
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save Link
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
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Add Module</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  Year: {selectedYearData?.name || "Select a year first"}
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
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Module name</label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="Module title"
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
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save Module
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
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Add Element</h3>
                <p className="text-xs text-[#6b6b7b] mt-1">
                  Module:{" "}
                  {elementModule
                    ? modulesList?.find((mod) => mod.id === elementModule)?.name || "Selected module"
                    : "Select a module"}
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
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Element name</label>
                <input
                  type="text"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="Element title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Module</label>
                <select
                  value={elementModule}
                  onChange={(e) => setElementModule(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                >
                  <option value="">Select module</option>
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
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save Element
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
