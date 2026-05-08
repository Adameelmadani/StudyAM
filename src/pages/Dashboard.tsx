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
  GraduationCap,
  LogOut,
  ChevronDown as ChevronDownIcon,
  FolderOpen,
  Upload,
} from "lucide-react";

type DocType = "all" | "cours" | "exam" | "test" | "tp" | "resume";

const typeColors: Record<string, string> = {
  cours: "bg-blue-100 text-blue-700",
  exam: "bg-red-100 text-red-700",
  test: "bg-orange-100 text-orange-700",
  tp: "bg-green-100 text-green-700",
  resume: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<string, string> = {
  cours: "Cours",
  exam: "Exam",
  test: "Test",
  tp: "TP",
  resume: "Résumé",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, isRepresentative, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSector, setSelectedSector] = useState<number | "">("");
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [docFilter, setDocFilter] = useState<DocType>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const selectedYearData = years?.find((y) => y.id === selectedYear);
  const showSectorSelector = selectedYearData?.hasSectors;

  const filteredDocs = elementDocs?.filter((d) =>
    docFilter === "all" ? true : d.type === docFilter
  );

  const toggleModule = (modId: number) => {
    setExpandedModule(expandedModule === modId ? null : modId);
    setSelectedElement(null);
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
        <div className="p-4 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-[#1a1a2e]">
              Study<span className="text-[#b24760]">AM</span>
            </span>
          )}
        </div>

        <nav className="px-2 space-y-1">
          <button className="nav-item active w-full">
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => { setExpandedModule(null); setSelectedElement(null); }}
            className="nav-item w-full"
          >
            <BookOpen className="w-5 h-5" />
            {sidebarOpen && <span>My Courses</span>}
          </button>
          {isRepresentative && (
            <button
              onClick={() => {
                if (selectedElement) {
                  document.getElementById("upload-modal")?.classList.remove("hidden");
                }
              }}
              className="nav-item w-full"
            >
              <Upload className="w-5 h-5" />
              {sidebarOpen && <span>Upload</span>}
            </button>
          )}
          <button className="nav-item w-full">
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
        <div className="p-8 max-w-6xl mx-auto">
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

          {selectedElement ? (
            /* Element Detail View */
            <div className="animate-fadeInUp">
              <button
                onClick={() => setSelectedElement(null)}
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

              {/* Document Type Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(["all", "cours", "exam", "test", "tp", "resume"] as DocType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setDocFilter(type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        docFilter === type
                          ? "bg-[#b24760] text-white shadow-md shadow-[#b24760]/25"
                          : "glass text-[#6b6b7b] hover:text-[#b24760]"
                      }`}
                    >
                      {type === "all" ? "All" : typeLabels[type]}
                      {type !== "all" && (
                        <span className="ml-1.5 text-xs opacity-70">
                          ({elementDocs?.filter((d) => d.type === type).length || 0})
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>

              {/* Documents List */}
              {filteredDocs && filteredDocs.length > 0 ? (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => (
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
                    No {docFilter === "all" ? "" : typeLabels[docFilter].toLowerCase()} documents uploaded yet
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
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
                            <BookOpen className="w-6 h-6 text-white" />
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
                              : "View elements"}
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
                                  onClick={() => setSelectedElement(el.id)}
                                  className="p-4 rounded-xl border border-[#f5d0d8] hover:border-[#b24760] hover:bg-[#fdf2f4] transition-all text-left"
                                >
                                  <h4 className="font-medium text-[#1a1a2e] mb-1">
                                    {el.name}
                                  </h4>
                                  <p className="text-xs text-[#6b6b7b]">
                                    {el.description || "Click to view documents"}
                                  </p>
                                  <div className="flex gap-1.5 mt-2">
                                    {["cours", "exam", "test", "tp", "resume"].map(
                                      (t) => (
                                        <span
                                          key={t}
                                          className={`w-2.5 h-2.5 rounded-full ${
                                            t === "cours"
                                              ? "bg-blue-400"
                                              : t === "exam"
                                              ? "bg-red-400"
                                              : t === "test"
                                              ? "bg-orange-400"
                                              : t === "tp"
                                              ? "bg-green-400"
                                              : "bg-purple-400"
                                          }`}
                                          title={typeLabels[t]}
                                        />
                                      )
                                    )}
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
                        onClick={() => setSelectedElement(doc.elementId)}
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
        </div>
      </main>
    </div>
  );
}
