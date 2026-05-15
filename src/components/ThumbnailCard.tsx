import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { extractGoogleDriveFileId, getDriveThumbnail } from "@/lib/fileTypeDetection";

export interface ThumbnailCardProps {
  id: number;
  title: string;
  type: string;
  url: string;
  createdAt: string;
  typeColors?: Record<string, string>;
  typeLabel?: string;
  onClick?: () => void;
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
}: ThumbnailCardProps) {
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const fileId = extractGoogleDriveFileId(url);
  const thumbnail = getDriveThumbnail(url);

  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : null;

  return (
    <div
      className="glass-strong overflow-hidden glass-hover transition-all cursor-pointer"
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
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-xs text-center px-2">
              {previewError
                ? "Preview not available"
                : "No preview available"}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
            typeColors[type] || "bg-gray-100 text-gray-700"
          }`}
        >
          {typeLabel || type}
        </span>
        <h4 className="font-medium text-[#1a1a2e] truncate mb-1 line-clamp-2">
          {title}
        </h4>
        <p className="text-xs text-[#6b6b7b]">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
