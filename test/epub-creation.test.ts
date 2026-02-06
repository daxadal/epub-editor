/**
 * Tests for EPUB creation from scratch
 * Based on examples/simple-example.ts
 */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB3Builder } from '../src';

const TEMP_DIR = path.join(__dirname, 'temp');

describe('EPUB Creation', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Basic EPUB Creation', () => {
    it('Returns a valid EPUB when the minimum requred metadata is provided', async () => {
      // given

      // when
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
        language: 'en',
      });

      // then
      expect(epub).toBeDefined();

      const metadata = epub.getMetadata();
      expect(metadata.title).toBe('Test Book');
      expect(metadata.creator).toBe('Test Author');
      expect(metadata.language).toBe('en');
      expect(metadata.identifier).toBeDefined();
      expect(metadata.date).toBeDefined();
    });

    it('Throws an error when title is missing', () => {
      // given
      const newEpubFunction = () =>
        new EPUB3Builder({
          title: '',
          creator: 'Test Author',
        } as any);

      // when

      // then
      expect(newEpubFunction).toThrow();
    });

    it('Throws an error when creator is missing', () => {
      // given
      const newEpubFunction = () =>
        new EPUB3Builder({
          title: 'Test Book',
          creator: '',
        } as any);

      // when

      // then
      expect(newEpubFunction).toThrow();
    });

    it('Returns a valid EPUB with default language to "en" if not provided', () => {
      // given

      // when
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.language).toBe('en');
    });

    it('Returns a valid EPUB when other Dublin Core Metadata fields are provided', () => {
      // given

      // when
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
        language: 'es',
        publisher: 'Test Publisher',
        description: 'A test book description',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.publisher).toBe('Test Publisher');
      expect(metadata.description).toBe('A test book description');
      expect(metadata.subject).toBe('Testing');
      expect(metadata.rights).toBe('Copyright 2026');
    });
  });

  describe('Adding Chapters', () => {
    it('A new chapter is reachable after is added', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      const chapterId = epub.addChapter({
        title: 'Chapter 1',
        content: '<p>This is the first chapter.</p>',
      });

      // then
      expect(chapterId).toBeDefined();
      expect(typeof chapterId).toBe('string');

      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Chapter 1');
      expect(chapters[0].content).toContain('This is the first chapter.');
    });

    it('All new chapters are reachable and ordered when added', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Chapter 1 content</p>',
      });

      epub.addChapter({
        title: 'Chapter 2',
        content: '<p>Chapter 2 content</p>',
      });

      epub.addChapter({
        title: 'Chapter 3',
        content: '<p>Chapter 3 content</p>',
      });

      // then
      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(3);
      expect(chapters[0].title).toBe('Chapter 1');
      expect(chapters[1].title).toBe('Chapter 2');
      expect(chapters[2].title).toBe('Chapter 3');
    });

    it('Child chapters can be reached below its parents', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      const part1 = epub.addChapter({
        title: 'Part I',
        content: '<p>Part I introduction</p>',
      });

      epub.addChapter({
        title: 'Chapter 1',
        parentId: part1,
        content: '<p>Chapter 1 content</p>',
      });

      epub.addChapter({
        title: 'Chapter 2',
        parentId: part1,
        content: '<p>Chapter 2 content</p>',
      });

      // then
      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Part I');
      expect(chapters[0].children).toHaveLength(2);
      expect(chapters[0].children[0].title).toBe('Chapter 1');
      expect(chapters[0].children[1].title).toBe('Chapter 2');
    });

    it('Multiple layers of chapter nesting are allowed and reachable', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      const part1 = epub.addChapter({
        title: 'Part I',
        content: '<p>Part I</p>',
      });

      const chapter1 = epub.addChapter({
        title: 'Chapter 1',
        parentId: part1,
        content: '<p>Chapter 1</p>',
      });

      epub.addChapter({
        title: 'Section 1.1',
        parentId: chapter1,
        content: '<p>Section 1.1</p>',
      });

      // then
      const rootChapters = epub.getRootChapters();
      expect(rootChapters[0].children[0].children).toHaveLength(1);
      expect(rootChapters[0].children[0].children[0].title).toBe('Section 1.1');
    });

    it('Chapters without content are allowed', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      const partId = epub.addChapter({
        title: 'Part I',
        headingLevel: 1,
      });

      // then
      expect(partId).toBeDefined();

      const chapters = epub.getRootChapters();
      expect(chapters[0].title).toBe('Part I');
      expect(chapters[0].headingLevel).toBe(1);
    });
  });

  describe('Adding Images', () => {
    it('Adding an image returns the image ID, and the image is stored in the internal info', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const imageData = Buffer.from('fake-image-data');

      // when
      const imageId = epub.addImage({
        filename: 'test-image.jpg',
        data: imageData,
        alt: 'Test Image',
      });

      // then
      expect(imageId).toBeDefined();

      const images = epub.getAllImages();
      expect(images).toHaveLength(1);
      expect(images[0].filename).toBe('images/test-image.jpg');
      expect(images[0].alt).toBe('Test Image');
    });

    it('All added images can be listed after being added', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      epub.addImage({
        filename: 'image1.jpg',
        data: Buffer.from('image1'),
        alt: 'Image 1',
      });

      epub.addImage({
        filename: 'image2.png',
        data: Buffer.from('image2'),
        alt: 'Image 2',
      });

      // then
      const images = epub.getAllImages();
      expect(images).toHaveLength(2);
    });

    it('Book cover image can be added and flagged as such', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-data'),
        alt: 'Book Cover',
        isCover: true,
      });

      // then
      const images = epub.getAllImages();
      expect(images[0].isCover).toBe(true);
    });
  });

  describe('Adding Stylesheets', () => {
    it('Adding an stylesheet returns the stylesheet ID, and the stylesheet is stored in the internal info', () => {
      // given

      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const cssContent = 'body { font-family: Arial; }';

      // when
      const styleId = epub.addStylesheet({
        filename: 'custom.css',
        content: cssContent,
      });

      // then
      expect(styleId).toBeDefined();

      const stylesheets = epub.getAllStylesheets();
      // Should have default stylesheet + custom one
      expect(stylesheets.length).toBeGreaterThanOrEqual(2);

      const customStyle = stylesheets.find(
        (s) => s.filename === 'css/custom.css',
      );
      expect(customStyle).toBeDefined();
      expect(customStyle?.content).toBe(cssContent);
    });

    it('A new ebook contains a default stylesheet', () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when

      // then
      const stylesheets = epub.getAllStylesheets();
      expect(stylesheets.length).toBeGreaterThanOrEqual(1);

      const defaultStyle = stylesheets.find((s) => s.id === 'default-style');
      expect(defaultStyle).toBeDefined();
    });
  });

  describe('Export to File', () => {
    it('Exporting to file creates a file in the specified route', async () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Export Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Test content</p>',
      });

      const outputPath = path.join(TEMP_DIR, 'test-export.epub');

      // when
      await epub.exportToFile(outputPath);

      // then
      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('Exporting to buffer returns a buffer', async () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Test Buffer Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Test content</p>',
      });

      // when
      const buffer = await epub.export();

      // then
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('Validating an EPUB returns true, and exporting to file creates a file in the specified route', async () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Structural Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Introduction',
        content: '<p>Introduction text</p>',
      });

      const part1 = epub.addChapter({
        title: 'Part I',
        content: '<p>Part I content</p>',
      });

      epub.addChapter({
        title: 'Chapter 1',
        parentId: part1,
        content: '<p>Chapter 1 content</p>',
      });

      const outputPath = path.join(TEMP_DIR, 'test-structure.epub');

      // when
      const validation = epub.validate();
      await epub.exportToFile(outputPath);

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);
    });
  });

  describe('Complex EPUB Creation', () => {
    it('should create EPUB with chapters, images, and custom styles', async () => {
      // given
      const epub = new EPUB3Builder({
        title: 'Complete Test Book',
        creator: 'Test Author',
        language: 'en',
        publisher: 'Test Publisher',
        description: 'A complete test book',
      });

      epub.addStylesheet({
        filename: 'custom-styles.css',
        content: 'p { margin: 1em 0; }',
      });

      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-image-data'),
        alt: 'Cover',
        isCover: true,
      });

      const imageId = epub.addImage({
        filename: 'diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Diagram',
      });

      epub.addChapter({
        title: 'Introduction',
        content: '<p>Welcome to the book!</p>',
      });

      const part1 = epub.addChapter({
        title: 'Part I: Basics',
        content: '<p>Part I introduction</p>',
      });

      epub.addChapter({
        title: 'Chapter 1',
        parentId: part1,
        content: `
          <p>This is chapter 1.</p>
          <img src="../images/${imageId}" alt="Diagram" />
        `,
      });

      epub.addChapter({
        title: 'Chapter 2',
        parentId: part1,
        content: '<p>This is chapter 2.</p>',
      });

      epub.addChapter({
        title: 'Conclusion',
        content: '<p>Thank you for reading!</p>',
      });

      const outputPath = path.join(TEMP_DIR, 'complete-book.epub');

      const rootChapters = epub.getRootChapters();
      const allChapters = epub.getAllChapters();

      // when
      const validation = epub.validate();
      await epub.exportToFile(outputPath);

      // then
      expect(validation.isValid).toBe(true);
      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      expect(rootChapters).toHaveLength(3); // intro, part1, conclusion
      expect(allChapters).toHaveLength(5); // intro, part1, chap1, chap2, conclusion
      expect(epub.getAllImages()).toHaveLength(2);
      expect(epub.getAllStylesheets().length).toBeGreaterThanOrEqual(2);
    });
  });
});
