/**
 * Generate the mimetype file content
 */

export function generateMimetype(): string {
  return 'application/epub+zip';
}
/**
 * Generate the META-INF/container.xml file
 */

export function generateContainer(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}
