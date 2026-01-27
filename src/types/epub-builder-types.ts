/**
 * Type definitions for EPUB Builder
 * Supporting EPUB 3.3 specification
 */

import { EPUBNavigationDocument } from './navigation-document';

/**
 * Dublin Core metadata fields for EPUB
 * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 */
export interface DublinCoreMetadata {
  /** Title of the publication (REQUIRED) */
  title: string;

  /** Creator/Author of the publication (REQUIRED) */
  creator: string;

  /** Language of the publication (default: 'en') */
  language?: string;

  /** Unique identifier (auto-generated if not provided) */
  identifier?: string;

  /** Publication date in ISO format (YYYY-MM-DD) */
  date?: string;

  /** Publisher name */
  publisher?: string;

  /** Description or summary */
  description?: string;

  /** Subject or keywords */
  subject?: string | string[];

  /** Rights statement (copyright) */
  rights?: string;

  /** Contributor(s) */
  contributor?: string | string[];

  /** Publication type */
  type?: string;

  /** Format */
  format?: string;

  /** Source */
  source?: string;

  /** Relation */
  relation?: string;

  /** Coverage (temporal or spatial) */
  coverage?: string;
}

/**
 * Chapter structure in the EPUB
 */
export interface Chapter {
  /** Unique identifier for the chapter */
  id: string;

  /** Chapter title for navigation */
  title: string;

  /** HTML content of the chapter */
  content: string;

  /** Filename in the EPUB (auto-generated) */
  filename: string;

  /** Parent chapter ID for nested chapters */
  parentId: string | null;

  /** Order in the spine */
  order: number;

  /** Child chapters */
  children: Chapter[];

  /** Optional heading level (1-6) */
  headingLevel?: number;

  /** Whether this chapter is linear (appears in reading order) */
  linear?: boolean;
}

/**
 * Image resource in the EPUB
 */
export interface ImageResource {
  /** Unique identifier */
  id: string;

  /** Filename in the EPUB */
  filename: string;

  /** Image data (Buffer) */
  data: Buffer;

  /** MIME type */
  mimeType: string;

  /** Optional alt text */
  alt?: string;

  /** Whether this is the cover image */
  isCover?: boolean;
}

/**
 * CSS Stylesheet resource
 */
export interface StylesheetResource {
  /** Unique identifier */
  id: string;

  /** Filename in the EPUB */
  filename: string;

  /** CSS content */
  content: string;
}

/**
 * Options for adding a new chapter
 */
export interface AddChapterOptions {
  /** Chapter title (required) */
  title: string;

  /** HTML content (can be added later) */
  content?: string;

  /** Parent chapter ID for nesting */
  parentId?: string | null;

  /** Optional heading level (1-6) */
  headingLevel?: number;

  /** Whether chapter is linear in reading order (default: true) */
  linear?: boolean;
}

/**
 * Options for adding an image
 */
export interface AddImageOptions {
  /** Image filename (with extension) */
  filename: string;

  /** Image data as Buffer or base64 string */
  data: Buffer | string;

  /** Optional alt text */
  alt?: string;

  /** Mark as cover image */
  isCover?: boolean;
}

/**
 * Options for adding a stylesheet
 */
export interface AddStylesheetOptions {
  /** Stylesheet filename */
  filename: string;

  /** CSS content */
  content: string;
}

/**
 * Options for exporting EPUB
 */
export interface ExportOptions {
  /** Output file path (for exportToFile) */
  filepath?: string;

  /** Compression level (0-9) */
  compression?: number;

  /** Validate before export */
  validate?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the EPUB is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * EPUB Package Document (OPF) manifest item
 */
export interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

/**
 * EPUB Package Document (OPF) spine item
 */
export interface SpineItem {
  idref: string;
  linear?: boolean;
  properties?: string;
}

/**
 * Internal EPUB structure
 */
export interface EPUBStructure {
  metadata: DublinCoreMetadata;
  chapters: Map<string, Chapter>;
  images: Map<string, ImageResource>;
  stylesheets: Map<string, StylesheetResource>;
  navigationDocument: EPUBNavigationDocument;
  rootChapters: string[]; // IDs of top-level chapters
}
