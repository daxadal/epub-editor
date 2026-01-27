import { v4 as uuidV4 } from 'uuid';
import {
  DublinCoreMetadata,
  Chapter,
  ImageResource,
  StylesheetResource,
  AddChapterOptions,
  AddImageOptions,
  AddStylesheetOptions,
  ValidationResult,
} from './types/base-epub-types';
import {
  getMimeType,
  isValidImageExtension,
  sanitizeFilename,
} from './utils/mime-types';
import { DEFAULT_CSS } from './utils/default-styles';

/**
 * Abstract base class for EPUB builders
 * Provides shared functionality for EPUB 2 and EPUB 3 builders
 */
export abstract class BaseEPUB3Builder {
  protected metadata: DublinCoreMetadata;
  protected readonly chapters: Map<string, Chapter>;
  protected readonly images: Map<string, ImageResource>;
  protected readonly stylesheets: Map<string, StylesheetResource>;
  protected rootChapterIds: string[];
  protected chapterCounter: number;

  constructor(
    metadata: Partial<DublinCoreMetadata> & { title: string; creator: string },
  ) {
    if (!metadata.title) {
      throw new Error('Title is required');
    }
    if (!metadata.creator) {
      throw new Error('Creator/Author is required');
    }

    this.metadata = {
      ...metadata,
      title: metadata.title,
      creator: metadata.creator,
      language: metadata.language || 'en',
      identifier: metadata.identifier || uuidV4(),
      date: metadata.date || new Date().toISOString().split('T')[0],
    };

    this.chapters = new Map();
    this.images = new Map();
    this.stylesheets = new Map();
    this.rootChapterIds = [];
    this.chapterCounter = 0;

    this.addDefaultStylesheet();
  }

  /**
   * Add the default stylesheet
   */
  private addDefaultStylesheet(): void {
    this.stylesheets.set('default-style', {
      id: 'default-style',
      filename: 'css/styles.css',
      content: DEFAULT_CSS,
    });
  }

  /**
   * Update metadata
   */
  public setMetadata(metadata: Partial<DublinCoreMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Get current metadata
   */
  public getMetadata(): DublinCoreMetadata {
    return { ...this.metadata };
  }

  /**
   * Add a new chapter
   * @returns Chapter ID
   */
  public addChapter(options: AddChapterOptions): string {
    const chapterId = this.generateChapterId();
    this.chapterCounter++;

    const filename = `text/chapter-${this.chapterCounter}.xhtml`;

    const chapter: Chapter = {
      id: chapterId,
      title: options.title,
      content: options.content || '',
      filename,
      parentId: options.parentId || null,
      order: this.getNextChapterOrder(),
      children: [],
      headingLevel: options.headingLevel,
      linear: options.linear !== false,
    };

    if (chapter.parentId) {
      const parent = this.chapters.get(chapter.parentId);
      if (!parent) {
        throw new Error(
          `Parent chapter with ID "${chapter.parentId}" not found`,
        );
      }
      parent.children.push(chapter);
    } else {
      this.rootChapterIds.push(chapterId);
    }

    this.chapters.set(chapterId, chapter);
    return chapterId;
  }

  /**
   * Update chapter content
   */
  public setChapterContent(chapterId: string, content: string): void {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) {
      throw new Error(`Chapter with ID "${chapterId}" not found`);
    }
    chapter.content = content;
  }

  /**
   * Append content to a chapter
   */
  public appendToChapter(chapterId: string, content: string): void {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) {
      throw new Error(`Chapter with ID "${chapterId}" not found`);
    }
    chapter.content += content;
  }

  /**
   * Get a chapter by ID
   */
  public getChapter(chapterId: string): Chapter | undefined {
    return this.chapters.get(chapterId);
  }

  /**
   * Get all root chapters (non-nested)
   */
  public getRootChapters(): Chapter[] {
    return this.rootChapterIds
      .map((id) => this.chapters.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get all chapters (including nested)
   */
  public getAllChapters(): Chapter[] {
    return Array.from(this.chapters.values());
  }

  /**
   * Delete a chapter
   */
  public deleteChapter(chapterId: string): void {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) {
      throw new Error(`Chapter with ID "${chapterId}" not found`);
    }

    if (chapter.parentId) {
      const parent = this.chapters.get(chapter.parentId);
      if (parent) {
        parent.children = parent.children.filter((c) => c.id !== chapterId);
      }
    } else {
      this.rootChapterIds = this.rootChapterIds.filter(
        (id) => id !== chapterId,
      );
    }

    this.deleteChapterRecursive(chapter);
  }

  private deleteChapterRecursive(chapter: Chapter): void {
    chapter.children.forEach((child) => this.deleteChapterRecursive(child));
    this.chapters.delete(chapter.id);
  }

  /**
   * Add an image to the EPUB
   * @returns Image ID
   */
  public addImage(options: AddImageOptions): string {
    if (!isValidImageExtension(options.filename)) {
      throw new Error(`Invalid image extension for file "${options.filename}"`);
    }

    const imageId = this.generateImageId();
    const sanitized = sanitizeFilename(options.filename);
    const filename = `images/${sanitized}`;

    const data =
      typeof options.data === 'string'
        ? Buffer.from(options.data, 'base64')
        : options.data;

    const image: ImageResource = {
      id: imageId,
      filename,
      data,
      mimeType: getMimeType(options.filename),
      alt: options.alt,
      isCover: options.isCover || false,
    };

    this.images.set(imageId, image);
    return imageId;
  }

  /**
   * Get an image by ID
   */
  public getImage(imageId: string): ImageResource | undefined {
    return this.images.get(imageId);
  }

  /**
   * Delete an image
   */
  public deleteImage(imageId: string): void {
    this.images.delete(imageId);
  }

  /**
   * Get all images
   */
  public getAllImages(): ImageResource[] {
    return Array.from(this.images.values());
  }

  /**
   * Add a custom stylesheet
   * @returns Stylesheet ID
   */
  public addStylesheet(options: AddStylesheetOptions): string {
    const styleId = this.generateStylesheetId();
    const sanitized = sanitizeFilename(options.filename);
    const filename = `css/${sanitized}`;

    const stylesheet: StylesheetResource = {
      id: styleId,
      filename,
      content: options.content,
    };

    this.stylesheets.set(styleId, stylesheet);
    return styleId;
  }

  /**
   * Get all stylesheets
   */
  public getAllStylesheets(): StylesheetResource[] {
    return Array.from(this.stylesheets.values());
  }

  /**
   * Validate the EPUB structure
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.metadata.title) {
      errors.push('Title is required');
    }
    if (!this.metadata.creator) {
      errors.push('Creator/Author is required');
    }

    if (this.chapters.size === 0) {
      warnings.push('No chapters added to EPUB');
    }

    this.chapters.forEach((chapter, id) => {
      if (chapter.parentId && !this.chapters.has(chapter.parentId)) {
        errors.push(
          `Chapter "${chapter.title}" (${id}) references non-existent parent "${chapter.parentId}"`,
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate unique chapter ID
   */
  protected generateChapterId(): string {
    return `chapter-${uuidV4()}`;
  }

  /**
   * Generate unique image ID
   */
  protected generateImageId(): string {
    return `image-${uuidV4()}`;
  }

  /**
   * Generate unique stylesheet ID
   */
  protected generateStylesheetId(): string {
    return `style-${uuidV4()}`;
  }

  /**
   * Get next chapter order number
   */
  protected getNextChapterOrder(): number {
    let maxOrder = 0;
    this.chapters.forEach((chapter) => {
      if (chapter.order > maxOrder) {
        maxOrder = chapter.order;
      }
    });
    return maxOrder + 1;
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  public abstract export(options?: any): Promise<Buffer>;
  public abstract exportToFile(filepath: string, options?: any): Promise<void>;
}
