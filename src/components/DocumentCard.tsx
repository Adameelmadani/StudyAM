import { useState } from "react";
import { FileText, ChevronDown, AlertCircle, Video, Presentation, Table } from "lucide-react";
import { FilePreview } from "./FilePreview";
import { getThumbnail } from "@/lib/fileTypeDetection";

export interface DocumentCardProps {
  id: number;
  title: string;
  type: string;
  url: string;
  uploaderName: string;
  createdAt: string;
  typeColors?: Record<string, string>;
  typeLabel?: string;
  onDelete?: () => void;
  canDelete?: boolean;
  showPreview?: boolean;
  fileType?: string;
}

export function DocumentCard({
  id,
  title,
  type,
  url,
  uploaderName,
  createdAt,
  typeColors = {},
  typeLabel,
  onDelete,
  canDelete = false,
  showPreview = true,
  fileType = "file",
}: DocumentCardProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(showPreview);
  const thumbnail = getThumbnail(url);

  return (
    <div className="glass-strong overflow-hidden">
      {thumbnail && (
        <div className="w-full h-32 bg-gray-100 border-b border-[#f5d0d8] overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setShowThumbnail(false)}
          />
        </div>
      )}
      <div className="p-4 flex items-center gap-4 hover:shadow-lg transition-all">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b24760]/10 to-[#b24760]/5 flex items-center justify-center shrink-0">
          {fileType === "video" ? (
            <Video className="w-5 h-5 text-[#b24760]" />
          ) : fileType === "presentation" ? (
            <Presentation className="w-5 h-5 text-[#b24760]" />
          ) : fileType === "spreadsheets" ? (
            <Table className="w-5 h-5 text-[#b24760]" />
          ) : (
            <FileText className="w-5 h-5 text-[#b24760]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[#1a1a2e] truncate">{title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[type] || "bg-gray-100 text-gray-700"}`}
            >
              {typeLabel || type}
            </span>
            <span className="text-xs text-[#6b6b7b]">By {uploaderName}</span>
            <span className="text-xs text-[#6b6b7b]">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPreview && (
            <button
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={showFullPreview ? "Hide preview" : "Show preview"}
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  showFullPreview ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glass text-xs py-2 px-4"
          >
            Open
          </a>
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Expandable preview section */}
      {showFullPreview && (
        <div className="border-t border-gray-200 p-4 bg-white/50">
          <FilePreview url={url} title={title} height="400px" />
        </div>
      )}
    </div>
  );
}
