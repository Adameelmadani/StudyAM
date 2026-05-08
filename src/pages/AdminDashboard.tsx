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
} from "lucide-react";

type AdminTab = "dashboard" | "students" | "representatives" | "courses" | "activity";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [grantEnsamCode, setGrantEnsamCode] = useState("");
  const [grantError, setGrantError] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleYear, setModuleYear] = useState<number | "">("");
  const [moduleSector, setModuleSector] = useState<number | "">("");
  const [elementName, setElementName] = useState("");
  const [elementModule, setElementModule] = useState<number | "">("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
    if (!authLoading && isAuthenticated && !isAdmin) {
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.user.stats.useQuery(undefined, { enabled: isAdmin });
  const { data: studentsData } = trpc.user.list.useQuery(
    { role: "student", search: searchQuery || undefined, limit: 50 },
    { enabled: isAdmin && activeTab === "students" }
  );
  const { data: repsData } = trpc.user.list.useQuery(
    { role: "representative", search: searchQuery || undefined, limit: 50 },
    { enabled: isAdmin && activeTab === "representatives" }
  );
  const grantSearchValue = grantEnsamCode.trim();
  const { data: grantSearchResults, isFetching: grantSearching } = trpc.user.list.useQuery(
    { role: "student", search: grantSearchValue || undefined, limit: 5 },
    { enabled: isAdmin && showGrantModal && grantSearchValue.length > 0 }
  );
  const { data: years } = trpc.year.list.useQuery();
  const { data: activityLogs } = trpc.activity.list.useQuery(
    { limit: 50 },
    { enabled: isAdmin && activeTab === "activity" }
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
    onSuccess: () => { setShowModuleModal(false); utils.invalidate(); },
  });
  const createElementMutation = trpc.element.create.useMutation({
    onSuccess: () => { setShowElementModal(false); utils.invalidate(); },
  });

  useEffect(() => {
    if (!showGrantModal) {
      setGrantEnsamCode("");
      setGrantError("");
    }
  }, [showGrantModal]);

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    setGrantError("");
    if (!grantCandidate) {
      setGrantError("No student found with that ENSAM code.");
      return;
    }
    if (!grantCandidate.yearId) {
      setGrantError("Selected student is missing a year assignment.");
      return;
    }
    grantMutation.mutate({
      userId: grantCandidate.id,
      yearId: grantCandidate.yearId,
      sectorId: grantCandidate.sectorId || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#b24760] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "representatives", label: "Représentants", icon: Shield },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="min-h-screen page-bg flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="sidebar relative w-full md:w-64 md:fixed md:left-0 md:top-0 md:bottom-0 md:z-40 border-b border-[#f5d0d8] md:border-b-0">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="p-4 flex items-center gap-3 mb-6 w-full text-left bg-transparent border-0 hover:opacity-90 focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1a1a2e]">
            Study<span className="text-[#b24760]">AM</span>
          </span>
        </button>

        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-[#6b6b7b] uppercase tracking-wider px-2">
            Admin Panel
          </span>
        </div>

        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item w-full ${activeTab === item.id ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          <button className="nav-item w-full">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="md:absolute md:bottom-0 md:left-0 md:right-0 p-4">
          <button
            onClick={logout}
            className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
          <div className="mt-3 pt-3 border-t border-[#f5d0d8]">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a2e]">{user?.name}</p>
                <p className="text-xs text-[#6b6b7b]">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1a1a2e]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-[#6b6b7b] mt-1">
              Manage your platform
            </p>
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
                  <p className="text-sm text-[#6b6b7b]">Total Students</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalRepresentatives}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">Représentants</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <BookOpen className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalElements}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">Course Elements</p>
                </div>
                <div className="glass-strong p-6">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-[#b24760]" />
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {stats.totalDocuments}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b6b7b]">Documents</p>
                </div>
              </div>

              {/* Quick Actions */}
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">Quick Actions</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => { setActiveTab("representatives"); setShowGrantModal(true); }}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <Shield className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">Grant Rep Access</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">Approve a représentant</p>
                </button>
                <button
                  onClick={() => { setActiveTab("courses"); setShowModuleModal(true); }}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <FolderPlus className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">Add Module</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">Create a new module</p>
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="glass-strong p-6 text-left glass-hover"
                >
                  <BarChart3 className="w-8 h-8 text-[#b24760] mb-3" />
                  <h4 className="font-medium text-[#1a1a2e]">View Activity</h4>
                  <p className="text-sm text-[#6b6b7b] mt-1">Monitor platform activity</p>
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
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-sm"
                  />
                </div>
              </div>

              <div className="glass-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full">
                    <thead>
                      <tr className="border-b border-[#f5d0d8]">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">ENSAM Code</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Year</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Actions</th>
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setGrantError("");
                                if (!u.yearId) {
                                  setGrantError("Selected student is missing a year assignment.");
                                  setGrantEnsamCode(u.ensamCode || "");
                                  setShowGrantModal(true);
                                  return;
                                }
                                grantMutation.mutate({
                                  userId: u.id,
                                  yearId: u.yearId,
                                  sectorId: u.sectorId || undefined,
                                });
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#fdf2f4] text-[#b24760]"
                              title="Grant représentant access"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="Delete"
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
                  <div className="p-8 text-center text-[#6b6b7b]">No students found</div>
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
                    placeholder="Search représentants..."
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Grant Access
                </button>
              </div>

              <div className="glass-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full">
                    <thead>
                      <tr className="border-b border-[#f5d0d8]">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">ENSAM Code</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Year</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider">Actions</th>
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.isApproved
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {u.isApproved ? "Active" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => revokeMutation.mutate({ userId: u.id })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                {repsData?.users.length === 0 && (
                  <div className="p-8 text-center text-[#6b6b7b]">No représentants found</div>
                )}
              </div>
            </>
          )}

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <button
                  onClick={() => setShowModuleModal(true)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Add Module
                </button>
                <button
                  onClick={() => setShowElementModal(true)}
                  className="btn-glass flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Add Element
                </button>
              </div>
              <div className="glass-strong p-8 text-center text-[#6b6b7b]">
                <BookOpen className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
                <p>Use the buttons above to manage modules and elements.</p>
                <p className="text-sm mt-1">Students browse these through the dashboard.</p>
              </div>
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
                    {log.action === "upload" && <UploadCloud className="w-4 h-4 text-green-600" />}
                    {log.action === "edit" && <Pencil className="w-4 h-4 text-blue-600" />}
                    {log.action === "delete" && <Trash2 className="w-4 h-4 text-red-600" />}
                    {log.action === "grant_access" && <Shield className="w-4 h-4 text-[#b24760]" />}
                    {log.action === "revoke_access" && <Shield className="w-4 h-4 text-orange-600" />}
                    {!["upload", "edit", "delete", "grant_access", "revoke_access"].includes(log.action) && (
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
                  No activity recorded yet
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
              Grant Représentant Access
            </h3>
            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Student ENSAM Code</label>
                <input
                  type="text"
                  value={grantEnsamCode}
                  onChange={(e) => setGrantEnsamCode(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  placeholder="Type the student code (e.g. AM1234)"
                  required
                />
                {grantSearching && (
                  <p className="text-xs text-[#6b6b7b] mt-2">Searching…</p>
                )}
                {!grantSearching && grantEnsamCode && !grantCandidate && (
                  <p className="text-xs text-red-600 mt-2">
                    No student found with that ENSAM code.
                  </p>
                )}
                {grantCandidate && (
                  <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                    <p className="font-medium">
                      Found: {grantCandidate.name} ({grantCandidate.ensamCode})
                    </p>
                    <p className="mt-1">
                      Year: {years?.find((y) => y.id === grantCandidate.yearId)?.name || "N/A"}
                      {grantCandidate.sectorId ? ` • Sector ID ${grantCandidate.sectorId}` : ""}
                    </p>
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
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">Add Module</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (moduleName && moduleYear) {
                  createModuleMutation.mutate({
                    name: moduleName,
                    yearId: Number(moduleYear),
                    sectorId: moduleSector ? Number(moduleSector) : undefined,
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Name</label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Year</label>
                <select
                  value={moduleYear}
                  onChange={(e) => {
                    setModuleYear(e.target.value ? Number(e.target.value) : "");
                    setModuleSector("");
                  }}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                >
                  <option value="">Select year</option>
                  {years?.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              {years?.find((y) => y.id === moduleYear)?.hasSectors && (
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Sector (optional)</label>
                  <select
                    value={moduleSector}
                    onChange={(e) => setModuleSector(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-2.5 glass-input text-sm"
                  >
                    <option value="">All sectors</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="flex-1 btn-glass"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Element Modal */}
      {showElementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">Add Element</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (elementName && elementModule) {
                  createElementMutation.mutate({
                    name: elementName,
                    moduleId: Number(elementModule),
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Name</label>
                <input
                  type="text"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
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
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowElementModal(false)}
                  className="flex-1 btn-glass"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-sm animate-fadeInUp">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Confirm Delete</h3>
            <p className="text-sm text-[#6b6b7b] mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-glass"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUserMutation.mutate({ id: deleteConfirm })}
                className="flex-1 px-6 py-3 rounded-full font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
