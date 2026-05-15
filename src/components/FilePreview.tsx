import { useState } from "react";
import { AlertCircle, Copy, Check } from "lucide-react";
import { extractGoogleDriveFileId } from "@/lib/fileTypeDetection";

interface FilePreviewProps {
  url: string;
  title: string;
  height?: string;
}

export function FilePreview({ url, title, height = "400px" }: FilePreviewProps) {
  const [previewError, setPreviewError] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileId = extractGoogleDriveFileId(url);

  if (!fileId) {
    return (
      <div
        className="w-full bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Could not extract file ID from URL
          </p>
        </div>
      </div>
    );
  }

  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (previewError) {
    return (
      <div
        className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-lg flex flex-col items-center justify-center p-6"
        style={{ height }}
      >
        <AlertCircle className="w-10 h-10 text-orange-400 mb-3" />
        <p className="text-sm font-medium text-gray-700 text-center mb-2">
          Preview Not Available
        </p>
        <p className="text-xs text-gray-500 text-center mb-4">
          This file may be restricted, deleted, or not accessible. You can still access it through the link below.
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Copy Link</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-200">
      <iframe
        src={previewUrl}
        title={`Preview of ${title}`}
        width="100%"
        height={height}
        frameBorder="0"
        allow="autoplay"
        onError={() => setPreviewError(true)}
        className="bg-white"
        style={{
          display: "block",
          height,
        }}
      />
    </div>
  );
}
