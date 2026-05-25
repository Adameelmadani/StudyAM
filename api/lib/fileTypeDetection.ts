export type FileType = "spreadsheets" | "presentation" | "file" | "video";

const MIME_TYPE_MAP: Record<string, FileType> = {
  "application/vnd.ms-powerpoint": "presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "presentation",
  "application/pdf": "file",
  "application/msword": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
  "application/vnd.ms-excel": "spreadsheets",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheets",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-matroska": "video",
  "image/jpeg": "file",
  "image/png": "file",
  "image/gif": "file",
  "image/webp": "file",
  "image/svg+xml": "file",
};

const EXTENSION_MAP: Record<string, FileType> = {
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  pdf: "file",
  doc: "file",
  docx: "file",
  odt: "file",
  rtf: "file",
  txt: "file",
  xls: "spreadsheets",
  xlsx: "spreadsheets",
  ods: "spreadsheets",
  csv: "spreadsheets",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  jpg: "file",
  jpeg: "file",
  png: "file",
  gif: "file",
  webp: "file",
  svg: "file",
};

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}

export function detectFileTypeFromUrl(url: string): FileType | null {
  try {
    if (extractYoutubeVideoId(url)) return "video";

    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Extract file extension
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (match) {
      const ext = match[1].toLowerCase();
      if (ext in EXTENSION_MAP) {
        return EXTENSION_MAP[ext];
      }
    }

    // Check for Google Drive file types
    const driveCategory = categorizeDriveLink(url);
    const mappedType = mapCategoryToFileType(driveCategory);
    if (mappedType) return mappedType;

    return null;
  } catch {
    return null;
  }
}

export function detectFileTypeFromName(fileName: string, mimeType?: string | null): FileType | null {
  if (mimeType) {
    const normalizedMimeType = mimeType.toLowerCase();
    if (normalizedMimeType in MIME_TYPE_MAP) {
      return MIME_TYPE_MAP[normalizedMimeType];
    }
  }

  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/i);
  if (match) {
    const ext = match[1];
    if (ext in EXTENSION_MAP) {
      return EXTENSION_MAP[ext];
    }
  }

  return null;
}

export function validateFileType(
  detectedType: FileType | null,
  selectedType: FileType
): boolean {
  if (!detectedType) return true;
  return detectedType === selectedType;
}

export function extractGoogleDriveFileId(url: string): string | null {
  try {
    // Pattern: /TYPE/d/{id} or /TYPE/d/{id}/view or /TYPE/d/{id}?...
    const match = url.match(/\/(?:document|spreadsheets|presentation|file)\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];

    // Fallback: id parameter in URL
    const urlObj = new URL(url);
    const idParam = urlObj.searchParams.get("id");
    if (idParam) return idParam;

    return null;
  } catch {
    return null;
  }
}

export function getDriveThumbnail(url: string): string | null {
  const youtubeId = extractYoutubeVideoId(url);
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  const fileId = extractGoogleDriveFileId(url);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : null;
}

export type GoogleDriveItemType = "DOCUMENT" | "SHEET" | "SLIDE" | "GENERIC_FILE" | "UNKNOWN";

export function categorizeDriveLink(url: string): GoogleDriveItemType {
  if (url.includes('/document/d/')) return 'DOCUMENT';
  if (url.includes('/spreadsheets/d/')) return 'SHEET';
  if (url.includes('/presentation/d/')) return 'SLIDE';
  if (url.includes('/file/d/')) return 'GENERIC_FILE';
  return 'UNKNOWN';
}

export function mapCategoryToFileType(category: GoogleDriveItemType): FileType | null {
  switch (category) {
    case 'DOCUMENT':
      return 'file';
    case 'SHEET':
      return 'spreadsheets';
    case 'SLIDE':
      return 'presentation';
    case 'GENERIC_FILE':
      return 'file';
    default:
      return null;
  }
}
