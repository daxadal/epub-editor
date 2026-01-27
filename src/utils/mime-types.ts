/**
 * MIME type utilities for EPUB resources
 */

/**
 * Get MIME type based on file extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',

    // Documents
    xhtml: 'application/xhtml+xml',
    html: 'application/xhtml+xml',
    xml: 'application/xml',

    // Stylesheets
    css: 'text/css',

    // Fonts
    otf: 'font/otf',
    ttf: 'font/ttf',
    woff: 'font/woff',
    woff2: 'font/woff2',

    // Audio
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    opus: 'audio/opus',

    // Video
    webm: 'video/webm',
    mp4: 'video/mp4',

    // Other
    js: 'application/javascript',
    json: 'application/json',
    pdf: 'application/pdf',
    txt: 'text/plain',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if a file extension is a valid image format for EPUB
 */
export function isValidImageExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  return validExtensions.includes(ext);
}

/**
 * Check if a MIME type is valid for EPUB content documents
 */
export function isValidContentDocumentMimeType(mimeType: string): boolean {
  return mimeType === 'application/xhtml+xml';
}

/**
 * Sanitize filename for use in EPUB
 * Removes or replaces invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  return filename
    .replaceAll(/[^a-zA-Z0-9._-]/g, '-')
    .replaceAll(/^\.+/, '') // Remove leading dots
    .replaceAll(/\.+$/, '') // Remove trailing dots
    .toLowerCase();
}

/**
 * Generate a safe filename from a title
 */
export function generateFilenameFromTitle(
  title: string,
  extension: string = 'xhtml',
): string {
  const base = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-+)|(-+$)/g, '')
    .substring(0, 50); // Limit length

  return `${base}.${extension}`;
}
