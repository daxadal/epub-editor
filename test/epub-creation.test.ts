/**
 * Tests for EPUB creation from scratch
 * Based on examples/simple-example.ts
 */

import * as path from 'path';

import * as fs from 'fs-extra';

import { EPUBBuilder } from '../src';

const TEMP_DIR = path.join(__dirname, 'temp');

describe('EPUB Creation', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Basic EPUB Creation', () => {
    it('should create a minimal EPUB with required metadata', async () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
        language: 'en',
      });

      expect(epub).toBeDefined();

      const metadata = epub.getMetadata();
      expect(metadata.title).toBe('Test Book');
      expect(metadata.creator).toBe('Test Author');
      expect(metadata.language).toBe('en');
      expect(metadata.identifier).toBeDefined();
      expect(metadata.date).toBeDefined();
    });

    it('should throw error when title is missing', () => {
      expect(() => {
        new EPUBBuilder({
          title: '',
          creator: 'Test Author',
        } as any);
      }).toThrow();
    });

    it('should throw error when creator is missing', () => {
      expect(() => {
        new EPUBBuilder({
          title: 'Test Book',
          creator: '',
        } as any);
      }).toThrow();
    });

    it('should set default language to "en" if not provided', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const metadata = epub.getMetadata();
      expect(metadata.language).toBe('en');
    });

    it('should accept custom metadata fields', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
        language: 'es',
        publisher: 'Test Publisher',
        description: 'A test book description',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      const metadata = epub.getMetadata();
      expect(metadata.publisher).toBe('Test Publisher');
      expect(metadata.description).toBe('A test book description');
      expect(metadata.subject).toBe('Testing');
      expect(metadata.rights).toBe('Copyright 2026');
    });
  });

  describe('Adding Chapters', () => {
    it('should add a simple chapter', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const chapterId = epub.addChapter({
        title: 'Chapter 1',
        content: '<p>This is the first chapter.</p>',
      });

      expect(chapterId).toBeDefined();
      expect(typeof chapterId).toBe('string');

      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Chapter 1');
      expect(chapters[0].content).toContain('This is the first chapter.');
    });

    it('should add multiple chapters', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

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

      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(3);
      expect(chapters[0].title).toBe('Chapter 1');
      expect(chapters[1].title).toBe('Chapter 2');
      expect(chapters[2].title).toBe('Chapter 3');
    });

    it('should add nested chapters with parent-child relationships', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

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

      const chapters = epub.getRootChapters();
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Part I');
      expect(chapters[0].children).toHaveLength(2);
      expect(chapters[0].children[0].title).toBe('Chapter 1');
      expect(chapters[0].children[1].title).toBe('Chapter 2');
    });

    it('should add deeply nested chapters', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

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

      const rootChapters = epub.getRootChapters();
      expect(rootChapters[0].children[0].children).toHaveLength(1);
      expect(rootChapters[0].children[0].children[0].title).toBe('Section 1.1');
    });

    it('should add chapter without content (section heading)', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const partId = epub.addChapter({
        title: 'Part I',
        headingLevel: 1,
      });

      expect(partId).toBeDefined();

      const chapters = epub.getRootChapters();
      expect(chapters[0].title).toBe('Part I');
      expect(chapters[0].headingLevel).toBe(1);
    });
  });

  describe('Adding Images', () => {
    it('should add an image', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const imageData = Buffer.from('fake-image-data');
      const imageId = epub.addImage({
        filename: 'test-image.jpg',
        data: imageData,
        alt: 'Test Image',
      });

      expect(imageId).toBeDefined();

      const images = epub.getAllImages();
      expect(images).toHaveLength(1);
      expect(images[0].filename).toBe('images/test-image.jpg');
      expect(images[0].alt).toBe('Test Image');
    });

    it('should add multiple images', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

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

      const images = epub.getAllImages();
      expect(images).toHaveLength(2);
    });

    it('should set cover image', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-data'),
        alt: 'Book Cover',
        isCover: true,
      });

      const images = epub.getAllImages();
      expect(images[0].isCover).toBe(true);
    });
  });

  describe('Adding Stylesheets', () => {
    it('should add a custom stylesheet', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const cssContent = 'body { font-family: Arial; }';
      const styleId = epub.addStylesheet({
        filename: 'custom.css',
        content: cssContent,
      });

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

    it('should include default stylesheet', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const stylesheets = epub.getAllStylesheets();
      expect(stylesheets.length).toBeGreaterThanOrEqual(1);

      const defaultStyle = stylesheets.find((s) => s.id === 'default-style');
      expect(defaultStyle).toBeDefined();
    });
  });

  describe('Export to File', () => {
    it('should export EPUB to file', async () => {
      const epub = new EPUBBuilder({
        title: 'Test Export Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Test content</p>',
      });

      const outputPath = path.join(TEMP_DIR, 'test-export.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should export EPUB to buffer', async () => {
      const epub = new EPUBBuilder({
        title: 'Test Buffer Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Test content</p>',
      });

      const buffer = await epub.export();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should create valid EPUB structure', async () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const outputPath = path.join(TEMP_DIR, 'test-structure.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);
    });
  });

  describe('Complex EPUB Creation', () => {
    it('should create EPUB with chapters, images, and custom styles', async () => {
      const epub = new EPUBBuilder({
        title: 'Complete Test Book',
        creator: 'Test Author',
        language: 'en',
        publisher: 'Test Publisher',
        description: 'A complete test book',
      });

      // Add custom stylesheet
      epub.addStylesheet({
        filename: 'custom-styles.css',
        content: 'p { margin: 1em 0; }',
      });

      // Add cover image
      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-image-data'),
        alt: 'Cover',
        isCover: true,
      });

      // Add content image
      const imageId = epub.addImage({
        filename: 'diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Diagram',
      });

      // Add chapters
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

      // Validate
      const validation = epub.validate();
      expect(validation.isValid).toBe(true);

      // Export
      const outputPath = path.join(TEMP_DIR, 'complete-book.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      // Verify structure
      const rootChapters = epub.getRootChapters();
      expect(rootChapters).toHaveLength(3); // intro, part1, conclusion
      expect(epub.getAllImages()).toHaveLength(2);
      expect(epub.getAllStylesheets().length).toBeGreaterThanOrEqual(2);
    });
  });
});
