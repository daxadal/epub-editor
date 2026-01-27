/**
 * EPUB Builder - Create and manipulate EPUB 2 and EPUB 3 files
 *
 * @module epub-builder
 */

export { EPUB2Builder } from './epub2/epub2.builder';
export { EPUB3Builder } from './epub3/epub3.builder';
export { BaseEPUB3Builder } from './base-epub/base-epub.builder';

// Export shared types
export {
  DublinCoreMetadata,
  Chapter,
  ImageResource,
  StylesheetResource,
  AddChapterOptions,
  AddImageOptions,
  AddStylesheetOptions,
  ExportOptions,
  ValidationResult,
  ManifestItem,
  SpineItem,
} from './base-epub/base-epub.types';

// Export EPUB 2 specific types
export { NCXDocument, NCXNavPoint } from './epub2/epub2.types';

// Export EPUB 3 specific types
export {
  EPUBNavigationDocument,
  TocNav,
  PageListNav,
  LandmarksNav,
  CustomNav,
  NavListItem,
  NavElement,
  RecommendedLandmarkType,
} from './epub3/epub3.types';
