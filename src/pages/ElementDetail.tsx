import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  ChevronRight,
  FileText,
  ExternalLink,
  Folder,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Link2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

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

export default function ElementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isRepresentative,
    isAdmin,
    logout,
  } = useAuth();
  const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkType, setLinkType] = useState<DocType>("cours");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const elementId = Number(id);
  const utils = trpc.useUtils();
  const { data: documentsList } = trpc.document.list.useQuery(
    { elementId },
    { enabled: !!elementId }
  );
  const createDoc = trpc.document.create.useMutation({
    onSuccess: () => {
      setShowLinkModal(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkError("");
      utils.document.list.invalidate({ elementId });
    },
  });
  const canManageDocs = isAdmin || isRepresentative;
  const baseFolderTypes: DocType[] = ["cours", "test", "exam", "tp"];
  const folderTypes: DocType[] = documentsList?.some((d) => d.type === "resume")
    ? [...baseFolderTypes, "resume"]
    : baseFolderTypes;
  const activeDocs = activeDocType
    ? documentsList?.filter((d) => d.type === activeDocType)
    : [];
  const isGoogleDriveUrl = (url: string) =>
    /https?:\/\/(drive|docs)\.google\.com\//i.test(url);

  const openLinkModal = (type: DocType) => {
    setLinkType(type);
    setLinkError("");
    setShowLinkModal(true);
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen page-bg flex">
      {/* Sidebar */}
      <aside className="sidebar w-64 fixed left-0 top-0 bottom-0 z-40">
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1a1a2e]">
              Course Documents
            </h1>
            <p className="text-sm text-[#6b6b7b] mt-1">
              {documentsList?.length || 0} document(s) available
            </p>
          </div>

          {!activeDocType ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {folderTypes.map((type) => {
                  const count = documentsList?.filter((d) => d.type === type).length || 0;
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
                    No {typeLabels[activeDocType].toLowerCase()} documents yet
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Link Modal */}
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
                if (!isGoogleDriveUrl(linkUrl)) {
                  setLinkError("Please provide a Google Drive URL.");
                  return;
                }
                createDoc.mutate({
                  title: linkTitle,
                  type: linkType,
                  url: linkUrl,
                  elementId,
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
                  required
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Google Drive URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-sm"
                  required
                  placeholder="https://drive.google.com/..."
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
    </div>
  );
}
