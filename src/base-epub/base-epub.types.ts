/**
 * Shared types for both EPUB 2 and EPUB 3 builders
 */

export interface EPUBOptions {
  addDefaultStylesheet?: boolean;
  ignoreHeadTitle?: boolean;
  addTitleToChapters?: boolean;
}

/**
 * Dublin Core metadata fields for EPUB
 * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 */
export interface DublinCoreMetadata {
  title: string;
  creator: string;
  language?: string;
  identifier?: string;
  date?: string;
  publisher?: string;
  description?: string;
  subject?: string | string[];
  rights?: string;
  contributor?: string | string[];
  type?: string;
  format?: string;
  source?: string;
  relation?: string;
  coverage?: string;
}

/**
 * Chapter structure in the EPUB
 */
export interface Chapter {
  id: string;
  title: string;
  content: string;
  filename: string;
  parentId?: string;
  order: number;
  children: Chapter[];
  headingLevel: number;
  linear?: boolean;
}

/**
 * Image resource in the EPUB
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
 * CSS Stylesheet resource
 */
export interface StylesheetResource {
  id: string;
  filename: string;
  content: string;
}

/**
 * Options for adding a new chapter
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
 * Options for exporting EPUB
 */
export interface ExportOptions {
  filepath?: string;
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

export type Replacement = {
  pattern: RegExp;
  replacement: string;
};
