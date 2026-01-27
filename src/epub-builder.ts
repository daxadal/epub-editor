import { promisify } from 'node:util';

import JSZip from 'jszip';
import * as fs from 'fs-extra';
import { v4 as uuidV4 } from 'uuid';
import { parseString } from 'xml2js';

import {
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
} from './types/epub-builder-types';
import {
  EPUBNavigationDocument,
  TocNav,
  NavListItem,
} from './types/navigation-document';
import {
  generateMimetype,
  generateContainer,
  generateChapterXHTML,
  generateOPF,
  generateNavigationDocument,
} from './utils/epub-templates';
import {
  getMimeType,
  isValidImageExtension,
  sanitizeFilename,
} from './utils/mime-types';
import { DEFAULT_CSS } from './utils/default-styles';

const parseXml = promisify(parseString);

/**
 * EPUBBuilder - Create and manipulate EPUB 3.3 files
 *
 * @example
 * ```typescript
 * const epub = new EPUBBuilder({
 *   title: 'My Book',
 *   creator: 'John Doe',
 *   language: 'en'
 * });
 *
 * const chapter1 = epub.addChapter({ title: 'Chapter 1', content: '<p>Hello</p>' });
 * epub.addChapter({ title: 'Section 1.1', parentId: chapter1, content: '<p>Nested</p>' });
 *
 * await epub.exportToFile('my-book.epub');
 * ```
 */
export class EPUBBuilder {
  private metadata: DublinCoreMetadata;
  private readonly chapters: Map<string, Chapter>;
  private readonly images: Map<string, ImageResource>;
  private readonly stylesheets: Map<string, StylesheetResource>;
  private rootChapterIds: string[];
  private chapterCounter: number;

  /**
   * Create a new EPUB builder
   */
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

    // Add default stylesheet
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

    // Validate parent if specified
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

    // Remove from parent's children or root list
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

    // Delete chapter and all its children recursively
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

    // Check required metadata
    if (!this.metadata.title) {
      errors.push('Title is required');
    }
    if (!this.metadata.creator) {
      errors.push('Creator/Author is required');
    }

    // Check chapters
    if (this.chapters.size === 0) {
      warnings.push('No chapters added to EPUB');
    }

    // Check for orphaned chapters
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
   * Export EPUB to a Buffer
   */
  public async export(options: ExportOptions = {}): Promise<Buffer> {
    if (options.validate !== false) {
      const validation = this.validate();
      if (!validation.isValid) {
        throw new Error(
          `EPUB validation failed:\n${validation.errors.join('\n')}`,
        );
      }
    }

    const zip = new JSZip();

    // Add mimetype (uncompressed, first file)
    zip.file('mimetype', generateMimetype(), { compression: 'STORE' });

    // Add META-INF/container.xml
    zip.file('META-INF/container.xml', generateContainer());

    // Add stylesheets
    this.stylesheets.forEach((stylesheet) => {
      zip.file(`EPUB/${stylesheet.filename}`, stylesheet.content);
    });

    // Get stylesheet hrefs for chapter templates
    const stylesheetHrefs = Array.from(this.stylesheets.values()).map(
      (s) => `../${s.filename}`,
    );

    // Add chapters
    this.chapters.forEach((chapter) => {
      const xhtml = generateChapterXHTML(chapter, stylesheetHrefs);
      zip.file(`EPUB/${chapter.filename}`, xhtml);
    });

    // Add images
    this.images.forEach((image) => {
      zip.file(`EPUB/${image.filename}`, image.data);
    });

    // Generate and add navigation document
    const navDoc = this.generateNavigationDocument();
    const navXhtml = generateNavigationDocument(navDoc, stylesheetHrefs);
    zip.file('EPUB/nav.xhtml', navXhtml);

    // Generate and add package.opf
    const opf = this.generatePackageDocument();
    zip.file('EPUB/package.opf', opf);

    // Generate zip
    const compression = options.compression ?? 9;
    return await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: compression },
      mimeType: 'application/epub+zip',
    });
  }

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

  /**
   * Parse an existing EPUB file
   */
  public static async parse(filepath: string): Promise<EPUBBuilder> {
    try {
      const data = await fs.readFile(filepath);
      return await EPUBBuilder.parseBuffer(data);
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse an EPUB from a Buffer
   */
  public static async parseBuffer(buffer: Buffer): Promise<EPUBBuilder> {
    try {
      const zip = await JSZip.loadAsync(buffer);

      // Read container.xml to find OPF location
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

      // Read OPF file
      const opfFile = zip.file(opfPath);
      if (!opfFile) {
        throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
      }

      const opfXml = await opfFile.async('string');
      const opfData = await parseXml(opfXml);

      // Extract metadata
      const metadata = EPUBBuilder.extractMetadata(opfData);

      // Create EPUB instance
      const epub = new EPUBBuilder(metadata);

      // Extract chapters, images, stylesheets
      await EPUBBuilder.extractResources(epub, zip, opfData, opfPath);

      return epub;
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB buffer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract metadata from OPF
   */
  private static extractMetadata(opfData: any): DublinCoreMetadata {
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

  /**
   * Extract resources from ZIP
   */
  private static async extractResources(
    epub: EPUBBuilder,
    zip: JSZip,
    opfData: any,
    opfPath: string,
  ): Promise<void> {
    const manifest = opfData?.package?.manifest?.[0]?.item || [];
    const spine = opfData?.package?.spine?.[0]?.itemref || [];

    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    // Extract chapters from spine order
    await EPUBBuilder.extractChapters(epub, zip, manifest, opfDir, spine);

    // Extract images
    await EPUBBuilder.extractImages(epub, zip, manifest, opfDir);
  }

  private static async extractChapters(
    epub: EPUBBuilder,
    zip: JSZip,
    manifest: any,
    opfDir: string,
    spine: any,
  ) {
    const chapterIds: string[] = [];
    for (const itemref of spine) {
      const idref = itemref.$?.idref;
      const manifestItem = manifest.find((item: any) => item.$.id === idref);

      if (
        manifestItem &&
        manifestItem.$?.['media-type'] === 'application/xhtml+xml'
      ) {
        const href = manifestItem.$.href;
        const properties = manifestItem.$?.properties;

        // Skip navigation document
        if (properties?.includes('nav')) continue;

        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const chapterId = epub.addChapter({
            title:
              EPUBBuilder.extractTitleFromXHTML(content) ||
              `Chapter ${chapterIds.length + 1}`,
            content: EPUBBuilder.extractBodyFromXHTML(content),
            linear: itemref.$?.linear !== 'no',
          });
          chapterIds.push(chapterId);
        }
      }
    }
  }

  private static async extractImages(
    epub: EPUBBuilder,
    zip: JSZip,
    manifest: any,
    opfDir: string,
  ) {
    for (const item of manifest) {
      const mimeType = item.$?.['media-type'];
      if (mimeType?.startsWith('image/')) {
        const href = item.$.href;
        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const data = await file.async('nodebuffer');
          const filename = href.split('/').pop() || 'image';
          epub.addImage({
            filename,
            data,
            isCover: item.$?.properties?.includes('cover-image'),
          });
        }
      }
    }
  }

  /**
   * Extract title from XHTML content
   */
  private static extractTitleFromXHTML(xhtml: string): string | null {
    const titleMatch = xhtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) return titleMatch[1];

    const h1Match = xhtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) return h1Match[1];

    return null;
  }

  /**
   * Extract body content from XHTML
   */
  private static extractBodyFromXHTML(xhtml: string): string {
    const bodyMatch = xhtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      // Remove the section wrapper if present
      const content = bodyMatch[1];
      const sectionMatch = content.match(
        /<section[^>]*>([\s\S]*?)<\/section>/i,
      );
      if (sectionMatch) {
        // Remove the heading
        const inner = sectionMatch[1];
        return inner.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/i, '').trim();
      }
      return content.trim();
    }
    return '';
  }

  /**
   * Generate Navigation Document
   */
  private generateNavigationDocument(): EPUBNavigationDocument {
    const toc: TocNav = {
      'epub:type': 'toc',
      heading: {
        level: 1,
        content: 'Table of Contents',
        id: 'toc-heading',
      },
      ol: this.generateTocItems(),
    };

    return {
      metadata: {
        title: 'Navigation',
        lang: this.metadata.language || 'en',
      },
      toc,
    };
  }

  /**
   * Generate TOC items from chapters
   */
  private generateTocItems(): NavListItem[] {
    const items: NavListItem[] = [];

    for (const rootId of this.rootChapterIds) {
      const chapter = this.chapters.get(rootId);
      if (chapter) {
        items.push(this.chapterToNavItem(chapter));
      }
    }

    return items;
  }

  /**
   * Convert chapter to nav item
   */
  private chapterToNavItem(chapter: Chapter): NavListItem {
    const item: NavListItem = {
      a: {
        href: chapter.filename,
        content: chapter.title,
      },
    };

    if (chapter.children.length > 0) {
      item.ol = chapter.children.map((child) => this.chapterToNavItem(child));
    }

    return item;
  }

  /**
   * Generate Package Document (OPF)
   */
  private generatePackageDocument(): string {
    const manifestItems: ManifestItem[] = [];
    const spineItems: SpineItem[] = [];

    // Add navigation document to manifest
    manifestItems.push({
      id: 'nav',
      href: 'nav.xhtml',
      mediaType: 'application/xhtml+xml',
      properties: 'nav',
    });

    // Add chapters to manifest and spine
    this.chapters.forEach((chapter) => {
      manifestItems.push({
        id: chapter.id,
        href: chapter.filename,
        mediaType: 'application/xhtml+xml',
      });

      spineItems.push({
        idref: chapter.id,
        linear: chapter.linear,
      });
    });

    // Add stylesheets to manifest
    this.stylesheets.forEach((stylesheet) => {
      manifestItems.push({
        id: stylesheet.id,
        href: stylesheet.filename,
        mediaType: 'text/css',
      });
    });

    // Add images to manifest
    this.images.forEach((image) => {
      manifestItems.push({
        id: image.id,
        href: image.filename,
        mediaType: image.mimeType,
        properties: image.isCover ? 'cover-image' : undefined,
      });
    });

    // Sort spine items by chapter order
    spineItems.sort((a, b) => {
      const chapterA = this.chapters.get(a.idref);
      const chapterB = this.chapters.get(b.idref);
      return (chapterA?.order || 0) - (chapterB?.order || 0);
    });

    return generateOPF(this.metadata, manifestItems, spineItems);
  }

  /**
   * Generate unique chapter ID
   */
  private generateChapterId(): string {
    return `chapter-${uuidV4()}`;
  }

  /**
   * Generate unique image ID
   */
  private generateImageId(): string {
    return `image-${uuidV4()}`;
  }

  /**
   * Generate unique stylesheet ID
   */
  private generateStylesheetId(): string {
    return `style-${uuidV4()}`;
  }

  /**
   * Get next chapter order number
   */
  private getNextChapterOrder(): number {
    let maxOrder = 0;
    this.chapters.forEach((chapter) => {
      if (chapter.order > maxOrder) {
        maxOrder = chapter.order;
      }
    });
    return maxOrder + 1;
  }
}
