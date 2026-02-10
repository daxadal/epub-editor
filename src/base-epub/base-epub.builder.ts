import { promisify } from 'node:util';
import * as path from 'node:path';

import * as fs from 'fs-extra';
import { v4 as uuidV4 } from 'uuid';
import JSZip from 'jszip';
import { parseString } from 'xml2js';

import {
  getMimeType,
  isValidImageExtension,
  sanitizeFilename,
} from '../utils/mime-types';
import { DEFAULT_CSS } from '../utils/default-styles';

import { getAllReplacements, hash } from './base-epub.merge-utils';
import {
  AddChapterOptions,
  AddImageOptions,
  AddStylesheetOptions,
  Chapter,
  DublinCoreMetadata,
  EPUBOptions,
  ExportOptions,
  ImageResource,
  StylesheetResource,
  ValidationResult,
} from './base-epub.types';

const parseXml = promisify(parseString);

const MAX_FILES = 10000;
const MAX_SIZE = 1000000000; // 1 GB

/**
 * Abstract base class for EPUB builders
 * Provides shared functionality for EPUB 2 and EPUB 3 builders
 */
export abstract class BaseEPUBBuilder {
  protected metadata: DublinCoreMetadata;
  protected readonly chapters: Map<string, Chapter>;
  protected readonly images: Map<string, ImageResource>;
  protected readonly stylesheets: Map<string, StylesheetResource>;
  protected rootChapterIds: string[];
  protected chapterCounter: number;
  protected includeDefStyleSheet: boolean;
  protected ignoreHeadTitle: boolean;

  constructor(metadata: DublinCoreMetadata, options: EPUBOptions = {}) {
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

    this.includeDefStyleSheet = options.addDefaultStylesheet ?? true;
    this.ignoreHeadTitle = options.ignoreHeadTitle ?? false;

    if (this.includeDefStyleSheet) this.addDefaultStylesheet();
  }

  // #region Metadata Getters/Setters

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

  // #endregion Metadata Getters/Setters

  // #region Chapter Management

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

  // #endregion Chapter Management

  // #region Image Management

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

  // #endregion Image Management

  // #region Stylesheet Management

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

  // #endregion Stylesheet Management

  // #region Validation

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

  // #endregion Validation

  // #region Utility Methods

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

  // #endregion Utility Methods

  // #region Export

  /**
   * Abstract methods to be implemented by subclasses
   */
  public abstract export(options?: any): Promise<Buffer>;

  /**
   * Export EPUB to a file
   */
  public async exportToFile(
    filepath: string,
    options: ExportOptions = {},
  ): Promise<void> {
    const buffer = await this.export(options);
    await fs.writeFile(filepath, buffer);
  }

  // #endregion Export

  // #region Parse - Public methods

  public static async parse(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filepath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: EPUBOptions,
  ): Promise<BaseEPUBBuilder> {
    throw new Error('Not implemented');
  }

  public static async parseBuffer(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _buffer: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: EPUBOptions,
  ): Promise<BaseEPUBBuilder> {
    throw new Error('Not implemented');
  }

  // #endregion Parse - Public methods

  // #region Parse - Protected helper methods

  protected static async unzip(
    buffer: Buffer<ArrayBufferLike>,
  ): Promise<JSZip> {
    let fileCount = 0;
    let totalSize = 0;

    const targetDirectory = path.join(__dirname, 'archive_tmp');

    const zip = await JSZip.loadAsync(buffer);

    zip.forEach(function (_, zipEntry) {
      fileCount++;
      if (fileCount > MAX_FILES) {
        throw new Error('Reached max. number of files');
      }

      // Prevent ZipSlip path traversal (S6096)
      const resolvedPath = path.join(targetDirectory, zipEntry.name);
      if (!resolvedPath.startsWith(targetDirectory)) {
        throw new Error('Path traversal detected');
      }

      const file = zip.file(zipEntry.name);
      if (file) {
        file.async('nodebuffer').then(function (content) {
          totalSize += content.length;
          if (totalSize > MAX_SIZE) {
            throw new Error('Reached max. size');
          }
        });
      }
    });

    return zip;
  }

  protected static async parseEpubZip(
    buffer: Buffer<ArrayBufferLike>,
  ): Promise<{ zip: JSZip; opfData: unknown; opfPath: any }> {
    const zip = await BaseEPUBBuilder.unzip(buffer);

    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }

    const containerXml = await containerFile.async('string');
    const container: any = await parseXml(containerXml);
    const opfPath =
      container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path'];

    if (!opfPath) {
      throw new Error('Invalid EPUB: OPF path not found in container.xml');
    }

    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
    }

    const opfXml = await opfFile.async('string');
    const opfData = await parseXml(opfXml);
    return { zip, opfData, opfPath };
  }

  protected static extractMetadata(opfData: any): DublinCoreMetadata {
    const meta = opfData?.package?.metadata?.[0];

    const parseMetaField = (fieldName: string) =>
      meta?.[fieldName]?.[0]?._ ?? meta?.[fieldName]?.[0] ?? undefined;

    const metadata = {
      title: parseMetaField('dc:title') ?? 'Untitled',
      creator: parseMetaField('dc:creator') ?? 'Unknown',
      language: parseMetaField('dc:language') ?? 'en',
      identifier: parseMetaField('dc:identifier'),
      date: parseMetaField('dc:date'),
      publisher: parseMetaField('dc:publisher'),
      description: parseMetaField('dc:description'),
      subject: meta?.['dc:subject'],
      rights: parseMetaField('dc:rights'),
      contributor: parseMetaField('dc:contributor'),
    };

    return metadata;
  }

  protected async extractResources(
    zip: JSZip,
    opfData: any,
    opfPath: string,
  ): Promise<void> {
    const manifest = opfData?.package?.manifest?.[0]?.item || [];
    const spine = opfData?.package?.spine?.[0]?.itemref || [];

    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    // Extract chapters from spine order
    await this.extractChapters(zip, manifest, opfDir, spine);

    // Extract images
    await this.extractImages(zip, manifest, opfDir);
  }

  protected abstract extractChapters(
    zip: JSZip,
    manifest: any,
    opfDir: string,
    spine: any,
  ): Promise<void>;

  protected async extractImages(
    zip: JSZip,
    manifest: any,
    opfDir: string,
  ): Promise<void> {
    for (const item of manifest) {
      const mimeType = item.$?.['media-type'];
      if (mimeType?.startsWith('image/')) {
        const href = item.$.href;
        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const data = await file.async('nodebuffer');
          const filename = href.split('/').pop() || 'image';
          this.addImage({
            filename,
            data,
            isCover: item.$?.properties?.includes('cover-image'),
          });
        }
      }
    }
  }

  protected extractTitleFromXHTML(xhtml: string): string | null {
    if (!this.ignoreHeadTitle) {
      const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(xhtml);
      if (titleMatch) return titleMatch[1].trim();
    }

    const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(xhtml);
    if (h1Match) return h1Match[1].trim();

    const h2Match = /<h2[^>]*>([^<]+)<\/h2>/i.exec(xhtml);
    if (h2Match) return h2Match[1].trim();

    return null;
  }

  // #endregion Parse - Protected helper methods

  // #region Merge - Public methods

  public addEpubAsChapter(
    chapter: Omit<AddChapterOptions, 'content'>,
    sourceEPUB: BaseEPUBBuilder,
    addedStylesheets: Map<string, string>,
    addedImages: Map<string, string>,
    bookNumber: number,
  ) {
    // Create a section chapter for this book
    const sectionId = this.addChapter(chapter);

    const stylesheetMap = this.copyStyleSheets(
      sourceEPUB,
      addedStylesheets,
      bookNumber,
    );

    // Get all images from this EPUB
    const imageMap = this.copyImages(sourceEPUB, addedImages, bookNumber);

    // Get all root chapters from this EPUB
    const rootChapters = sourceEPUB.getRootChapters();

    const chapterCount = this.copyAllChapters(
      rootChapters,
      stylesheetMap,
      imageMap,

      sectionId,
    );
    return chapterCount;
  }

  // #endregion Merge - Public methods

  // #region Merge - Protected helper methods

  protected copyStyleSheets(
    sourceEPUB: BaseEPUBBuilder,
    addedStylesheets: Map<string, string>,
    bookNumber: number,
  ): Map<string, string> {
    // Get all stylesheets from this EPUB (except default)
    const stylesheets = sourceEPUB
      .getAllStylesheets()
      .filter((s) => s.id !== 'default-style');

    // Add stylesheets with unique naming
    const stylesheetMap = new Map<string, string>(); // old filename -> new filename
    for (const stylesheet of stylesheets) {
      const contentHash = hash(stylesheet.content);

      if (!addedStylesheets.has(contentHash)) {
        // This stylesheet hasn't been added yet
        const uniqueFilename = `book${bookNumber}-${path.basename(stylesheet.filename)}`;
        this.addStylesheet({
          filename: uniqueFilename,
          content: stylesheet.content,
        });
        addedStylesheets.set(contentHash, uniqueFilename);
        stylesheetMap.set(stylesheet.filename, uniqueFilename);
        console.log(`      ✓ Added stylesheet: ${uniqueFilename}`);
      } else {
        stylesheetMap.set(
          stylesheet.filename,
          addedStylesheets.get(contentHash)!,
        );
      }
    }
    return stylesheetMap;
  }

  protected copyImages(
    sourceEPUB: BaseEPUBBuilder,
    addedImages: Map<string, string>,
    bookNumber: number,
  ): Map<string, string> {
    const images = sourceEPUB.getAllImages();

    // Add images with unique naming
    const imageMap = new Map<string, string>(); // old filename -> new filename
    for (const image of images) {
      const dataHash = hash(image.data);

      if (!addedImages.has(dataHash)) {
        // This image hasn't been added yet
        const originalFilename = path.basename(image.filename);
        const ext = path.extname(originalFilename);
        const baseName = path.basename(originalFilename, ext);
        const uniqueFilename = `book${bookNumber}-${baseName}${ext}`;

        this.addImage({
          filename: uniqueFilename,
          data: image.data,
          alt: image.alt,
          isCover: false, // Don't preserve cover flags in merged book
        });
        addedImages.set(dataHash, uniqueFilename);
        imageMap.set(image.filename, uniqueFilename);
        console.log(`      ✓ Added image: ${uniqueFilename}`);
      } else {
        imageMap.set(image.filename, addedImages.get(dataHash)!);
      }
    }
    return imageMap;
  }

  protected copyAllChapters(
    rootChapters: Chapter[],
    stylesheetMap: Map<string, string>,
    imageMap: Map<string, string>,
    sectionId: string,
  ) {
    // Add all chapters as children of the section
    let chapterCount = 0;
    for (const chapter of rootChapters) {
      const allReplacements = getAllReplacements(stylesheetMap, imageMap);

      // Update content to reflect new image and stylesheet paths
      let updatedContent = chapter.content;
      for (const { pattern, replacement } of allReplacements) {
        updatedContent = updatedContent.replace(pattern, replacement);
      }

      const mergedChapterId = this.addChapter({
        title: chapter.title,
        content: updatedContent,
        parentId: sectionId,
        headingLevel: chapter.headingLevel,
        linear: chapter.linear,
      });

      chapterCount++;

      if (chapter.children && chapter.children.length > 0) {
        const childrenCount = this.copyAllChapters(
          chapter.children,
          stylesheetMap,
          imageMap,

          mergedChapterId,
        );
        chapterCount += childrenCount;
      }
    }
    return chapterCount;
  }

  // #endregion Merge - Protected helper methods
}
