import * as fs from 'fs-extra';
import JSZip from 'jszip';

import { BaseEPUBBuilder } from '../base-epub/base-epub.builder';
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

import { EPUBNavigationDocument, NavListItem, TocNav } from './epub3.types';
import {
  generateChapterXHTML,
  generateNavigationDocument,
  generateOPF,
} from './epub3.templates';

/**
 * EPUB3Builder - Create and manipulate EPUB 3.3 files
 *
 * @example
 * ```typescript
 * const epub = new EPUB3Builder({
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
export class EPUB3Builder extends BaseEPUBBuilder {
  /**
   * Create a new EPUB 3 builder
   */
  constructor(metadata: DublinCoreMetadata, options?: EPUBOptions) {
    super(metadata, options);
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
   * Parse an existing EPUB 3 file
   */
  public static async parse(
    filepath: string,
    options?: EPUBOptions,
  ): Promise<EPUB3Builder> {
    try {
      const data = await fs.readFile(filepath);
      return await EPUB3Builder.parseBuffer(data, options);
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse an EPUB 3 from a Buffer
   */
  public static async parseBuffer(
    buffer: Buffer,
    options?: EPUBOptions,
  ): Promise<EPUB3Builder> {
    try {
      const { opfData, zip, opfPath } = await EPUB3Builder.parseEpubZip(buffer);

      const metadata = EPUB3Builder.extractMetadata(opfData);
      const epub = new EPUB3Builder(metadata, options);

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

    // Find nav document
    const navItem = manifest.find((item: any) =>
      item.$?.properties?.includes('nav'),
    );

    if (!navItem) {
      this.addWarning(
        'No nav document found in manifest, falling back to spine-only parsing',
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
      return;
    }

    const navHref = navItem.$.href;
    const navPath = opfDir + navHref;
    const navFile = zip.file(navPath);

    if (!navFile) {
      this.addWarning(
        `Nav document not found at ${navPath}, falling back to spine-only parsing`,
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
      return;
    }

    try {
      const navContent = await navFile.async('string');

      // Track which files we've seen in navigation
      const filesInNav = new Set<string>();

      // Parse nav.xhtml and extract TOC
      await this.parseNavDocument(
        navContent,
        zip,
        manifestMap,
        opfDir,
        spineMap,
        filesInNav,
      );

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
        `Failed to parse nav document: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.extractChaptersFromSpine(zip, manifestMap, opfDir, spineMap);
    }
  }

  /**
   * Parse nav.xhtml document and extract TOC structure
   */
  private async parseNavDocument(
    navContent: string,
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
    filesInNav: Set<string>,
  ): Promise<void> {
    // Find the TOC nav element
    const tocMatch =
      /<nav[^>]+epub:type=["']toc["'][^>]*>([\s\S]*?)<\/nav>/i.exec(
        navContent,
      );

    if (!tocMatch) {
      this.addWarning('No TOC nav element found in nav document');
      return;
    }

    const tocContent = tocMatch[1];

    // Find the main ol element
    const olMatch = /<ol[^>]*>([\s\S]*?)<\/ol>/i.exec(tocContent);

    if (!olMatch) {
      this.addWarning('No ordered list found in TOC nav');
      return;
    }

    // Parse the list structure
    await this.parseNavList(
      olMatch[1],
      zip,
      manifestMap,
      opfDir,
      spineMap,
      filesInNav,
      undefined,
    );
  }

  /**
   * Parse a nav list (ol) recursively
   */
  private async parseNavList(
    listContent: string,
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
    filesInNav: Set<string>,
    parentId?: string,
  ): Promise<void> {
    // Extract all li elements at this level
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;

    while ((liMatch = liPattern.exec(listContent)) !== null) {
      await this.parseNavListItem(
        liMatch[1],
        zip,
        manifestMap,
        opfDir,
        spineMap,
        filesInNav,
        parentId,
      );
    }
  }

  /**
   * Parse a single nav list item
   */
  private async parseNavListItem(
    itemContent: string,
    zip: JSZip,
    manifestMap: Map<string, any>,
    opfDir: string,
    spineMap: Map<string, { linear: boolean; order: number }>,
    filesInNav: Set<string>,
    parentId?: string,
  ): Promise<void> {
    // Extract the anchor element
    const anchorMatch =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(itemContent);

    if (!anchorMatch) {
      return;
    }

    const href = anchorMatch[1];
    const labelHtml = anchorMatch[2];

    // Extract text from label (remove any nested tags)
    const navLabel = labelHtml.replace(/<[^>]+>/g, '').trim() || 'Untitled';

    // Parse href and fragment
    const [file, fragment] = href.split('#');
    filesInNav.add(file);

    // Find manifest item by href
    let manifestItem: any = null;
    for (const [, item] of manifestMap) {
      if (item.$.href === file) {
        manifestItem = item;
        break;
      }
    }

    if (!manifestItem) {
      this.addWarning(
        `Navigation entry "${navLabel}" references file "${file}" not found in manifest`,
      );
      return;
    }

    // Check if file exists in zip
    const filePath = opfDir + file;
    const zipFile = zip.file(filePath);

    if (!zipFile) {
      this.addWarning(
        `File "${file}" referenced in navigation not found in EPUB`,
      );
      return;
    }

    // Get spine info
    const spineInfo = spineMap.get(manifestItem.$.id);
    let linear = spineInfo?.linear ?? false;
    const order = spineInfo?.order ?? 9999;

    // Warn if not in spine
    if (!spineInfo) {
      this.addWarning(
        `Navigation entry "${navLabel}" (${file}) not found in spine, setting linear=false`,
      );
      linear = false;
    }

    let chapterId: string;

    if (fragment) {
      // This is a fragment reference
      // First, check if we already have a chapter for this file
      let sourceChapterId: string | null = null;
      for (const [id, chapter] of this.chapters) {
        if (chapter.filename === file && !chapter.fragment) {
          sourceChapterId = id;
          break;
        }
      }

      // If no source chapter exists, create one
      if (!sourceChapterId) {
        const content = await zipFile.async('string');
        const titleInfo = this.extractTitleFromXHTML(content, navLabel);

        sourceChapterId = this.addChapter({
          title: titleInfo.title || navLabel,
          content: EPUB3Builder.extractBodyFromXHTML(content),
          headingLevel: titleInfo.headingLevel,
          linear,
          addTitleToContent: titleInfo.addTitleToContent,
          parentId,
        });

        // Update internal tracking
        const sourceChapter = this.chapters.get(sourceChapterId);
        if (sourceChapter) {
          sourceChapter.filename = file;
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
        fragmentChapter.filename = file;
        fragmentChapter.fragment = fragment;
        fragmentChapter.sourceChapterId = sourceChapterId;
        fragmentChapter.order = order;
      }
    } else {
      // Regular chapter without fragment
      // Check if we already created this chapter
      let existingId: string | null = null;
      for (const [id, chapter] of this.chapters) {
        if (chapter.filename === file && !chapter.fragment) {
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
        const content = await zipFile.async('string');
        const titleInfo = this.extractTitleFromXHTML(content, navLabel);

        chapterId = this.addChapter({
          title: titleInfo.title || navLabel,
          content: EPUB3Builder.extractBodyFromXHTML(content),
          headingLevel: titleInfo.headingLevel,
          linear,
          addTitleToContent: titleInfo.addTitleToContent,
          parentId,
        });

        // Update internal tracking
        const chapter = this.chapters.get(chapterId);
        if (chapter) {
          chapter.filename = file;
          chapter.order = order;
        }
      }
    }

    // Check for nested ol (children)
    const nestedOlMatch = /<ol[^>]*>([\s\S]*?)<\/ol>/i.exec(itemContent);
    if (nestedOlMatch) {
      await this.parseNavList(
        nestedOlMatch[1],
        zip,
        manifestMap,
        opfDir,
        spineMap,
        filesInNav,
        chapterId,
      );
    }
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

      // Skip the nav document itself
      if (manifestItem.$?.properties?.includes('nav')) {
        continue;
      }

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
        content: EPUB3Builder.extractBodyFromXHTML(content),
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

        // Skip the nav document
        if (manifestItem.$?.properties?.includes('nav')) {
          continue;
        }

        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const titleInfo = this.extractTitleFromXHTML(content);

          const chapterId = this.addChapter({
            title: titleInfo.title || `Chapter ${this.chapters.size + 1}`,
            content: EPUB3Builder.extractBodyFromXHTML(content),
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
      const sectionMatch = /<section[^>]*>([\s\S]*?)<\/section>/i.exec(content);
      if (sectionMatch) {
        const inner = sectionMatch[1];
        return inner.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/i, '').trim();
      }
      return content.trim();
    }
    return '';
  }
}
