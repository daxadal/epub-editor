import JSZip from 'jszip';
import * as fs from 'fs-extra';
import { parseStringPromise } from 'xml2js';

import { BaseEPUBBuilder } from '../base-epub/base-epub.builder';
import { EPUB3Builder } from '../epub3/epub3.builder';
import {
  Chapter,
  DublinCoreMetadata,
  EPUBOptions,
  ExportOptions,
  ManifestItem,
  SpineItem,
} from '../base-epub/base-epub.types';
import {
  generateContainer,
  generateMimetype,
} from '../base-epub/base-epub.templates';

import { NCXDocument, NCXNavPoint } from './epub2.types';
import {
  generateChapterXHTML,
  generateNCX,
  generateOPF,
} from './epub2.templates';

/**
 * EPUB2Builder - Create and manipulate EPUB 2.0.1 files
 *
 * @example
 * ```typescript
 * const epub = new EPUB2Builder({
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
export class EPUB2Builder extends BaseEPUBBuilder {
  /**
   * Create a new EPUB 2 builder
   */
  constructor(metadata: DublinCoreMetadata, options?: EPUBOptions) {
    super(metadata, options);
  }

  /**
   * Export EPUB 2 to a Buffer
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

    // Generate and add NCX
    const ncxDoc = this.generateNCXDocument();
    const ncxXml = generateNCX(ncxDoc);
    zip.file('EPUB/toc.ncx', ncxXml);

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
   * Convert this EPUB 2 to EPUB 3
   * @returns New EPUB3Builder instance with converted content
   */
  public toEPUB3(): EPUB3Builder {
    // Create new EPUB3Builder with the same metadata
    const epub3 = new EPUB3Builder(this.metadata);

    // Copy all chapters
    const chapterMap = new Map<string, string>(); // old ID -> new ID

    // First pass: create all chapters
    this.chapters.forEach((chapter) => {
      const newId = epub3.addChapter({
        title: chapter.title,
        content: chapter.content,
        parentId: chapter.parentId
          ? chapterMap.get(chapter.parentId)
          : undefined,
        headingLevel: chapter.headingLevel,
        linear: chapter.linear,
      });
      chapterMap.set(chapter.id, newId);
    });

    // Copy all images
    this.images.forEach((image) => {
      epub3.addImage({
        filename: image.filename.split('/').pop() || 'image',
        data: image.data,
        alt: image.alt,
        isCover: image.isCover,
      });
    });

    // Copy all stylesheets (except default which is already added)
    this.stylesheets.forEach((stylesheet) => {
      if (stylesheet.id !== 'default-style') {
        epub3.addStylesheet({
          filename: stylesheet.filename.split('/').pop() || 'style.css',
          content: stylesheet.content,
        });
      }
    });

    return epub3;
  }

  /**
   * Generate NCX Document
   */
  private generateNCXDocument(): NCXDocument {
    return {
      uid: this.metadata.identifier || 'unknown',
      docTitle: this.metadata.title,
      docAuthor: this.metadata.creator,
      navMap: this.generateNCXNavMap(),
    };
  }

  /**
   * Generate NCX navMap from chapters
   */
  private generateNCXNavMap(): NCXNavPoint[] {
    const navPoints: NCXNavPoint[] = [];

    for (const rootId of this.rootChapterIds) {
      const chapter = this.chapters.get(rootId);
      if (chapter) {
        navPoints.push(this.chapterToNCXNavPoint(chapter));
      }
    }

    return navPoints;
  }

  /**
   * Convert chapter to NCX navPoint
   */
  private chapterToNCXNavPoint(chapter: Chapter): NCXNavPoint {
    const navPoint: NCXNavPoint = {
      id: chapter.id,
      navLabel: chapter.title,
      content: chapter.filename,
    };

    if (chapter.children.length > 0) {
      navPoint.children = chapter.children.map((child) =>
        this.chapterToNCXNavPoint(child),
      );
    }

    return navPoint;
  }

  /**
   * Generate Package Document (OPF 2.0)
   */
  private generatePackageDocument(): string {
    const manifestItems: ManifestItem[] = [];
    const spineItems: SpineItem[] = [];

    // Add NCX to manifest
    const ncxId = 'ncx';
    manifestItems.push({
      id: ncxId,
      href: 'toc.ncx',
      mediaType: 'application/x-dtbncx+xml',
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
      });
    });

    // Sort spine items by chapter order
    spineItems.sort((a, b) => {
      const chapterA = this.chapters.get(a.idref);
      const chapterB = this.chapters.get(b.idref);
      return (chapterA?.order || 0) - (chapterB?.order || 0);
    });

    return generateOPF(this.metadata, manifestItems, spineItems, ncxId);
  }

  /**
   * Parse an existing EPUB 2 file
   */
  public static async parse(
    filepath: string,
    options?: EPUBOptions,
  ): Promise<EPUB2Builder> {
    try {
      const data = await fs.readFile(filepath);
      return await EPUB2Builder.parseBuffer(data, options);
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse an EPUB 2 from a Buffer
   */
  public static async parseBuffer(
    buffer: Buffer,
    options?: EPUBOptions,
  ): Promise<EPUB2Builder> {
    try {
      const { opfData, zip, opfPath } = await EPUB2Builder.parseEpubZip(buffer);

      const metadata = EPUB2Builder.extractMetadata(opfData);
      const epub = new EPUB2Builder(metadata, options);

      await epub.extractResources(zip, opfData, opfPath);

      return epub;
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB buffer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected async extractChapters(
    zip: JSZip,
    manifest: any,
    opfDir: string,
    spine: any,
  ): Promise<void> {
    // Build manifest map for quick lookup
    const manifestMap = new Map<string, any>();
    for (const item of manifest) {
      manifestMap.set(item.$.id, item);
    }

    // Build spine map for linear property and order
    const spineMap = new Map<string, { linear: boolean; order: number }>();
    spine.forEach((itemref: any, index: number) => {
      const idref = itemref.$.idref;
      spineMap.set(idref, {
        linear: itemref.$?.linear !== 'no',
        order: index,
      });
    });

    // Find and parse NCX file
    const ncxItem = manifest.find(
      (item: any) => item.$?.['media-type'] === 'application/x-dtbncx+xml',
    );

    if (!ncxItem) {
      this.addWarning(
        'No NCX file found in manifest, falling back to spine-only parsing',
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
      return;
    }

    const ncxHref = ncxItem.$.href;
    const ncxPath = opfDir + ncxHref;
    const ncxFile = zip.file(ncxPath);

    if (!ncxFile) {
      this.addWarning(
        `NCX file not found at ${ncxPath}, falling back to spine-only parsing`,
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
      return;
    }

    try {
      const ncxContent = await ncxFile.async('string');
      const ncxData = await parseStringPromise(ncxContent);
      const navMap = ncxData.ncx?.navMap?.[0]?.navPoint || [];

      // Track which files we've seen in navigation
      const filesInNav = new Set<string>();

      // Process navigation structure
      for (const navPoint of navMap) {
        await this.processNavPoint(
          navPoint,
          zip,
          manifestMap,
          opfDir,
          spineMap,
          filesInNav,
          undefined,
        );
      }

      // Handle orphaned chapters (in spine but not in navigation)
      await this.handleOrphanedChapters(
        zip,
        manifestMap,
        opfDir,
        spineMap,
        filesInNav,
      );
    } catch (error) {
      this.addWarning(
        `Failed to parse NCX: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
    }
  }

  /**
   * Process a single navigation point recursively
   */
  private async processNavPoint(
    navPoint: any,
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
    filesInNav: Set<string>,
    parentId?: string,
  ): Promise<string | null> {
    const navLabel = navPoint.navLabel?.[0]?.text?.[0] || 'Untitled';
    const contentSrc = navPoint.content?.[0]?.$?.src;

    if (!contentSrc) {
      this.addWarning(`Navigation point "${navLabel}" has no content source`);
      return null;
    }

    // Parse href and fragment
    const [href, fragment] = contentSrc.split('#');
    filesInNav.add(href);

    // Find manifest item by href
    let manifestItem: any = null;
    for (const [, item] of manifestMap) {
      if (item.$.href === href) {
        manifestItem = item;
        break;
      }
    }

    if (!manifestItem) {
      this.addWarning(
        `Navigation point "${navLabel}" references file "${href}" not found in manifest`,
      );
      return null;
    }

    // Check if file exists in zip
    const filePath = opfDir + href;
    const file = zip.file(filePath);

    if (!file) {
      this.addWarning(
        `File "${href}" referenced in navigation not found in EPUB`,
      );
      return null;
    }

    // Get spine info
    const spineInfo = spineMap.get(manifestItem.$.id);
    let linear = spineInfo?.linear ?? false;
    const order = spineInfo?.order ?? 9999;

    // Warn if not in spine
    if (!spineInfo) {
      this.addWarning(
        `Navigation entry "${navLabel}" (${href}) not found in spine, setting linear=false`,
      );
      linear = false;
    }

    let chapterId: string;

    if (fragment) {
      // This is a fragment reference
      // First, check if we already have a chapter for this file
      let sourceChapterId: string | null = null;
      for (const [id, chapter] of this.chapters) {
        if (chapter.filename === href && !chapter.fragment) {
          sourceChapterId = id;
          break;
        }
      }

      // If no source chapter exists, create one
      if (!sourceChapterId) {
        const content = await file.async('string');
        const titleInfo = this.extractTitleFromXHTML(content, navLabel);

        sourceChapterId = this.addChapter({
          title: titleInfo.title || navLabel,
          content: EPUB2Builder.extractBodyFromXHTML(content),
          headingLevel: titleInfo.headingLevel,
          linear,
          addTitleToContent: titleInfo.addTitleToContent,
          parentId,
        });

        // Update internal tracking
        const sourceChapter = this.chapters.get(sourceChapterId);
        if (sourceChapter) {
          sourceChapter.filename = href;
          sourceChapter.order = order;
        }
      }

      // Create fragment-based chapter
      chapterId = this.addChapter({
        title: navLabel,
        content: '', // No content for fragment chapters
        headingLevel: 2,
        linear,
        addTitleToContent: false,
        parentId,
      });

      // Update internal tracking for fragment chapter
      const fragmentChapter = this.chapters.get(chapterId);
      if (fragmentChapter) {
        fragmentChapter.filename = href;
        fragmentChapter.fragment = fragment;
        fragmentChapter.sourceChapterId = sourceChapterId;
        fragmentChapter.order = order;
      }
    } else {
      // Regular chapter without fragment
      // Check if we already created this chapter (from a previous fragment reference)
      let existingId: string | null = null;
      for (const [id, chapter] of this.chapters) {
        if (chapter.filename === href && !chapter.fragment) {
          existingId = id;
          break;
        }
      }

      if (existingId) {
        // Update the existing chapter's title from nav if NAV is in titleExtraction
        const chapter = this.chapters.get(existingId);
        if (chapter && this.titleExtraction.includes('NAV')) {
          chapter.title = navLabel;
        }
        if (chapter && parentId && chapter.parentId !== parentId) {
          // Update parent relationship
          chapter.parentId = parentId;
          const parent = this.chapters.get(parentId);
          if (parent && !parent.children.find((c) => c.id === existingId)) {
            parent.children.push(chapter);
          }
        }
        chapterId = existingId;
      } else {
        // Create new chapter
        const content = await file.async('string');
        const titleInfo = this.extractTitleFromXHTML(content, navLabel);

        chapterId = this.addChapter({
          title: titleInfo.title || navLabel,
          content: EPUB2Builder.extractBodyFromXHTML(content),
          headingLevel: titleInfo.headingLevel,
          linear,
          addTitleToContent: titleInfo.addTitleToContent,
          parentId,
        });

        // Update internal tracking
        const chapter = this.chapters.get(chapterId);
        if (chapter) {
          chapter.filename = href;
          chapter.order = order;
        }
      }
    }

    // Process children recursively
    const children = navPoint.navPoint || [];
    for (const childNavPoint of children) {
      await this.processNavPoint(
        childNavPoint,
        zip,
        manifestMap,
        opfDir,
        spineMap,
        filesInNav,
        chapterId,
      );
    }

    return chapterId;
  }

  /**
   * Handle chapters in spine but not in navigation (orphaned chapters)
   */
  private async handleOrphanedChapters(
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
    filesInNav: Set<string>,
  ): Promise<void> {
    for (const [idref, spineInfo] of spineMap) {
      const manifestItem = manifestMap.get(idref);
      if (
        !manifestItem ||
        manifestItem.$?.['media-type'] !== 'application/xhtml+xml'
      ) {
        continue;
      }

      const href = manifestItem.$.href;

      // Check if already processed in navigation
      if (filesInNav.has(href)) {
        continue;
      }

      const filePath = opfDir + href;
      const file = zip.file(filePath);

      if (!file) {
        this.addWarning(`Orphaned chapter file "${href}" not found in EPUB`);
        continue;
      }

      this.addWarning(
        `Chapter "${href}" found in spine but not in navigation, adding as root chapter`,
      );

      const content = await file.async('string');
      const titleInfo = this.extractTitleFromXHTML(content);

      const chapterId = this.addChapter({
        title: titleInfo.title || `Orphaned: ${href}`,
        content: EPUB2Builder.extractBodyFromXHTML(content),
        headingLevel: titleInfo.headingLevel,
        linear: spineInfo.linear,
        addTitleToContent: titleInfo.addTitleToContent,
      });

      // Update internal tracking
      const chapter = this.chapters.get(chapterId);
      if (chapter) {
        chapter.filename = href;
        chapter.order = spineInfo.order;
      }
    }
  }

  /**
   * Fallback: Extract chapters from spine only (old behavior)
   */
  private async extractChaptersFromSpine(
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
  ): Promise<void> {
    for (const [idref, spineInfo] of spineMap) {
      const manifestItem = manifestMap.get(idref);

      if (
        manifestItem &&
        manifestItem.$?.['media-type'] === 'application/xhtml+xml'
      ) {
        const href = manifestItem.$.href;
        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const titleInfo = this.extractTitleFromXHTML(content);

          const chapterId = this.addChapter({
            title: titleInfo.title || `Chapter ${this.chapters.size + 1}`,
            content: EPUB2Builder.extractBodyFromXHTML(content),
            headingLevel: titleInfo.headingLevel,
            linear: spineInfo.linear,
            addTitleToContent: titleInfo.addTitleToContent,
          });

          // Update internal tracking
          const chapter = this.chapters.get(chapterId);
          if (chapter) {
            chapter.filename = href;
            chapter.order = spineInfo.order;
          }
        }
      }
    }
  }

  private static extractBodyFromXHTML(xhtml: string): string {
    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(xhtml);
    if (bodyMatch) {
      const content = bodyMatch[1];
      const divMatch = /<div[^>]*>([\s\S]*?)<\/div>/i.exec(content);
      if (divMatch) {
        const inner = divMatch[1];
        return inner.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/i, '').trim();
      }
      return content.trim();
    }
    return '';
  }
}
