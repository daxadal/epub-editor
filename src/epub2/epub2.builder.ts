import { promisify } from 'node:util';

import JSZip from 'jszip';
import * as fs from 'fs-extra';
import { parseString } from 'xml2js';

import { BaseEPUBBuilder } from '../base-epub/base-epub.builder';
import { EPUB3Builder } from '../epub3/epub3.builder';
import {
  DublinCoreMetadata,
  Chapter,
  ManifestItem,
  SpineItem,
  ExportOptions,
} from '../base-epub/base-epub.types';
import { generateMimetype, generateContainer } from '../epub3/epub3.templates';

import { NCXDocument, NCXNavPoint } from './epub2.types';
import {
  generateChapterXHTML,
  generateOPF,
  generateNCX,
} from './epub2.templates';

const parseXml = promisify(parseString);

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
  constructor(
    metadata: Partial<DublinCoreMetadata> & { title: string; creator: string },
  ) {
    super(metadata);
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
   * Export EPUB 2 to a file
   */
  public async exportToFile(
    filepath: string,
    options: ExportOptions = {},
  ): Promise<void> {
    const buffer = await this.export(options);
    await fs.writeFile(filepath, buffer);
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
  public static async parse(filepath: string): Promise<EPUB2Builder> {
    try {
      const data = await fs.readFile(filepath);
      return await EPUB2Builder.parseBuffer(data);
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse an EPUB 2 from a Buffer
   */
  public static async parseBuffer(buffer: Buffer): Promise<EPUB2Builder> {
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

      const metadata = EPUB2Builder.extractMetadata(opfData);
      const epub = new EPUB2Builder(metadata);

      await EPUB2Builder.extractResources(epub, zip, opfData, opfPath);

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
      meta?.[fieldName]?.[0]?._ ?? meta?.[fieldName]?.[0];

    const title = parseMetaField('dc:title') ?? 'Untitled';
    const creator = parseMetaField('dc:creator') ?? 'Unknown';
    const language = parseMetaField('dc:language') ?? 'en';
    const identifier = parseMetaField('dc:identifier');
    const date = parseMetaField('dc:date');
    const publisher = parseMetaField('dc:publisher');
    const description = parseMetaField('dc:description');
    const subject = meta?.['dc:subject'];
    const rights = parseMetaField('dc:rights');
    const contributor = parseMetaField('dc:contributor');

    return {
      title,
      creator,
      language,
      identifier,
      date,
      publisher,
      description,
      subject,
      rights,
      contributor,
    };
  }

  private static async extractResources(
    epub: EPUB2Builder,
    zip: JSZip,
    opfData: any,
    opfPath: string,
  ): Promise<void> {
    const manifest = opfData?.package?.manifest?.[0]?.item || [];
    const spine = opfData?.package?.spine?.[0]?.itemref || [];

    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    const chapterIds: string[] = [];
    for (const itemref of spine) {
      const idref = itemref.$?.idref;
      const manifestItem = manifest.find((item: any) => item.$.id === idref);

      if (
        manifestItem &&
        manifestItem.$?.['media-type'] === 'application/xhtml+xml'
      ) {
        const href = manifestItem.$.href;
        const filePath = opfDir + href;
        const file = zip.file(filePath);

        if (file) {
          const content = await file.async('string');
          const chapterId = epub.addChapter({
            title:
              EPUB2Builder.extractTitleFromXHTML(content) ||
              `Chapter ${chapterIds.length + 1}`,
            content: EPUB2Builder.extractBodyFromXHTML(content),
            linear: itemref.$?.linear !== 'no',
          });
          chapterIds.push(chapterId);
        }
      }
    }

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
