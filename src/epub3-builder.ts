import { promisify } from 'node:util';

import JSZip from 'jszip';
import * as fs from 'fs-extra';
import { parseString } from 'xml2js';

import { BaseEPUBBuilder } from './base-epub-builder';
import {
  DublinCoreMetadata,
  ManifestItem,
  SpineItem,
  ExportOptions,
} from './types/base-epub-types';
import {
  EPUBNavigationDocument,
  TocNav,
  NavListItem,
} from './types/epub3-types';
import {
  generateMimetype,
  generateContainer,
  generateChapterXHTML,
  generateOPF,
  generateNavigationDocument,
} from './utils/epub-templates';

const parseXml = promisify(parseString);

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
  constructor(
    metadata: Partial<DublinCoreMetadata> & { title: string; creator: string },
  ) {
    super(metadata);
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
  public static async parse(filepath: string): Promise<EPUB3Builder> {
    try {
      const data = await fs.readFile(filepath);
      return await EPUB3Builder.parseBuffer(data);
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse an EPUB 3 from a Buffer
   */
  public static async parseBuffer(buffer: Buffer): Promise<EPUB3Builder> {
    try {
      const zip = await JSZip.loadAsync(buffer);

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

      const metadata = EPUB3Builder.extractMetadata(opfData);
      const epub = new EPUB3Builder(metadata);

      await EPUB3Builder.extractResources(epub, zip, opfData, opfPath);

      return epub;
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB buffer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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

  private static async extractResources(
    epub: EPUB3Builder,
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

        if (properties?.includes('nav')) continue;

        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const chapterId = epub.addChapter({
            title:
              EPUB3Builder.extractTitleFromXHTML(content) ||
              `Chapter ${chapterIds.length + 1}`,
            content: EPUB3Builder.extractBodyFromXHTML(content),
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

  private static extractTitleFromXHTML(xhtml: string): string | null {
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(xhtml);
    if (titleMatch) return titleMatch[1];

    const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(xhtml);
    if (h1Match) return h1Match[1];

    return null;
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
