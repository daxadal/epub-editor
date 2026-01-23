/**
 * EPUB Builder - Create and manipulate EPUB 3.3 files
 *
 * @module epub-builder
 */

export { EPUBBuilder } from './epub-builder';

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
  EPUBStructure,
} from './types/epub-builder-types';

export {
  EPUBNavigationDocument,
  TocNav,
  PageListNav,
  LandmarksNav,
  CustomNav,
  NavListItem,
  NavElement,
  RecommendedLandmarkType,
} from './types/navigation-document';
