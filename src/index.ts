/**
 * EPUB Builder - Create and manipulate EPUB 2 and EPUB 3 files
 *
 * @module epub-builder
 */

export { EPUB2Builder } from './epub2-builder';
export { EPUBBuilder } from './epub-builder';
export { BaseEPUBBuilder } from './base-epub-builder';

// Export EPUBBuilder as EPUBBuilder for backwards compatibility
export { EPUBBuilder as EPUBBuilder } from './epub-builder';

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
} from './types/base-epub-types';

// Export EPUB 2 specific types
export { NCXDocument, NCXNavPoint } from './types/epub2-types';

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
} from './types/epub-builder-types';
