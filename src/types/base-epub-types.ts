/**
 * Shared types for both EPUB 2 and EPUB 3 builders
 */

/**
 * Dublin Core Metadata - shared across EPUB versions
 */
export interface DublinCoreMetadata {
  title: string;
  creator: string;
  language: string;
  identifier?: string;
  date?: string;
  publisher?: string;
  description?: string;
  subject?: string | string[];
  rights?: string;
  contributor?: string;
}

/**
 * Chapter/Content Document representation
 */
export interface Chapter {
  id: string;
  title: string;
  content: string;
  filename: string;
  parentId: string | null;
  order: number;
  children: Chapter[];
  headingLevel?: number;
  linear: boolean;
}

/**
 * Image resource
 */
export interface ImageResource {
  id: string;
  filename: string;
  data: Buffer;
  mimeType: string;
  alt?: string;
  isCover?: boolean;
}

/**
 * Stylesheet resource
 */
export interface StylesheetResource {
  id: string;
  filename: string;
  content: string;
}

/**
 * Options for adding a chapter
 */
export interface AddChapterOptions {
  title: string;
  content?: string;
  parentId?: string;
  headingLevel?: number;
  linear?: boolean;
}

/**
 * Options for adding an image
 */
export interface AddImageOptions {
  filename: string;
  data: Buffer | string;
  alt?: string;
  isCover?: boolean;
}

/**
 * Options for adding a stylesheet
 */
export interface AddStylesheetOptions {
  filename: string;
  content: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  validate?: boolean;
  compression?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Manifest item
 */
export interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

/**
 * Spine item
 */
export interface SpineItem {
  idref: string;
  linear?: boolean;
}
