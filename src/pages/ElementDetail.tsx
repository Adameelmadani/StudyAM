import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  ChevronRight,
  FileText,
  ExternalLink,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Upload,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

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

export default function ElementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, isRepresentative, logout } = useAuth();
  const [docFilter, setDocFilter] = useState<DocType>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<string>("cours");
  const [uploadUrl, setUploadUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const elementId = Number(id);
  const { data: documentsList } = trpc.document.list.useQuery(
    { elementId },
    { enabled: !!elementId }
  );
  const createDoc = trpc.document.create.useMutation({
    onSuccess: () => {
      setShowUpload(false);
      setUploadTitle("");
      setUploadUrl("");
      utils.document.list.invalidate({ elementId });
    },
  });
  const utils = trpc.useUtils();

  const filteredDocs = documentsList?.filter((d) =>
    docFilter === "all" ? true : d.type === docFilter
  );

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#b24760] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen page-bg flex">
      {/* Sidebar */}
      <aside className="sidebar w-64 fixed left-0 top-0 bottom-0 z-40">
        <div className="p-4 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b24760] to-[#8e3850] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1a1a2e]">
            Study<span className="text-[#b24760]">AM</span>
          </span>
        </div>
        <nav className="px-2 space-y-1">
          <button onClick={() => navigate("/dashboard")} className="nav-item w-full">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={logout} className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8 max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
            <button onClick={() => navigate("/dashboard")} className="hover:text-[#b24760]">
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#1a1a2e] font-medium">Element {elementId}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">
                Course Documents
              </h1>
              <p className="text-sm text-[#6b6b7b] mt-1">
                {documentsList?.length || 0} document(s) available
              </p>
            </div>
            {isRepresentative && (
              <button
                onClick={() => setShowUpload(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", "cours", "exam", "test", "tp", "resume"] as DocType[]).map((type) => (
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
                    ({documentsList?.filter((d) => d.type === type).length || 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Documents */}
          {filteredDocs && filteredDocs.length > 0 ? (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="glass-strong p-5 flex items-center gap-4 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[#b24760]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#1a1a2e] truncate">{doc.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[doc.type]}`}>
                        {typeLabels[doc.type]}
                      </span>
                      <span className="text-xs text-[#6b6b7b]">by {doc.uploaderName}</span>
                      <span className="text-xs text-[#6b6b7b]/60">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-glass flex items-center gap-1.5 text-sm shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-strong p-12 text-center">
              <FileText className="w-12 h-12 text-[#f5d0d8] mx-auto mb-3" />
              <p className="text-[#6b6b7b]">
                No {docFilter === "all" ? "" : typeLabels[docFilter].toLowerCase()} documents yet
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-strong p-8 w-full max-w-md animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded-lg hover:bg-[#fdf2f4]">
                <X className="w-5 h-5 text-[#6b6b7b]" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (uploadTitle && uploadUrl) {
                  createDoc.mutate({
                    title: uploadTitle,
                    type: uploadType as "cours" | "exam" | "test" | "tp" | "resume",
                    url: uploadUrl,
                    elementId,
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                >
                  <option value="cours">Cours</option>
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="tp">TP</option>
                  <option value="resume">Résumé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Google Drive URL</label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="flex-1 btn-glass">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
