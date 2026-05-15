import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Trash2, Video, Presentation, Table, FileText } from "lucide-react";
import { extractGoogleDriveFileId, getThumbnail } from "@/lib/fileTypeDetection";

export interface ThumbnailCardProps {
  id: number;
  title: string;
  type: string;
  url: string;
  createdAt: string;
  typeColors?: Record<string, string>;
  typeLabel?: string;
  onClick?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  fileType?: string;
}

export function ThumbnailCard({
  id,
  title,
  type,
  url,
  createdAt,
  typeColors = {},
  typeLabel,
  onClick,
  onDelete,
  canDelete = false,
  fileType = "file",
}: ThumbnailCardProps) {
  const { t } = useTranslation();
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const fileId = extractGoogleDriveFileId(url);
  const thumbnail = getThumbnail(url);

  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : null;

  return (
    <div
      className="glass-strong overflow-hidden glass-hover transition-all cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Thumbnail Preview */}
      <div className="relative w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {thumbnail && !previewError ? (
          <>
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-pulse text-gray-400 text-sm">
                  Loading...
                </div>
              </div>
            )}
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => setPreviewLoading(false)}
              onError={() => {
                setPreviewError(true);
                setPreviewLoading(false);
              }}
              style={{
                opacity: previewLoading ? 0 : 1,
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            {fileType === "video" ? (
              <Video className="w-8 h-8 mb-2" />
            ) : fileType === "presentation" ? (
              <Presentation className="w-8 h-8 mb-2" />
            ) : fileType === "spreadsheets" ? (
              <Table className="w-8 h-8 mb-2" />
            ) : (
              <FileText className="w-8 h-8 mb-2" />
            )}
            <span className="text-xs text-center px-2">
              {previewError
                ? "Preview not available"
                : "No preview available"}
            </span>
          </div>
        )}

        {/* Delete Button - appears on hover */}
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1.5 ${
            typeColors[type] || "bg-gray-100 text-gray-700"
          }`}
        >
          {typeLabel || type}
        </span>
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1.5 ml-1.5 bg-gray-100 text-gray-500 uppercase tracking-wider">
          {t(`fileTypes.${fileType}`)}
        </span>
        <h4 className="font-medium text-[#1a1a2e] truncate mb-0.5 line-clamp-2 text-sm">
          {title}
        </h4>
        <p className="text-xs text-[#6b6b7b]">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
