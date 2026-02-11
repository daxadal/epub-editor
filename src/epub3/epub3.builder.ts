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

        if (properties?.includes('nav')) continue;

        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const chapterId = this.addChapter({
            title: `Chapter ${chapterIds.length + 1}`,
            ...this.extractTitleFromXHTML(content),
            content: EPUB3Builder.extractBodyFromXHTML(content),
            linear: itemref.$?.linear !== 'no',
          });
          chapterIds.push(chapterId);
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
