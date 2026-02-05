/**
 * Tests for EPUB validation
 */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder } from '../../src';

const RESOURCES_DIR = path.join(__dirname, 'resources');
const TEMP_DIR = path.join(__dirname, 'temp');
const SIMPLE_GUIDE_PATH = path.join(RESOURCES_DIR, 'simple-guide.epub');

describe('EPUB Validation', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Valid EPUB', () => {
    it('Properly constructed EPUB passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Valid Book',
        creator: 'Test Author',
        language: 'en',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Valid content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('Parsed EPUB passes validation', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('EPUB with nested chapters passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Nested Book',
        creator: 'Test Author',
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

      epub.addChapter({
        title: 'Chapter 2',
        parentId: part1,
        content: '<p>Chapter 2 content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('EPUB with images passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Book with Images',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Chapter with image</p>',
      });

      epub.addImage({
        filename: 'test-image.jpg',
        data: Buffer.from('image-data'),
        alt: 'Test Image',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('EPUB with custom stylesheets passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Book with Styles',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Styled content</p>',
      });

      epub.addStylesheet({
        filename: 'custom.css',
        content: 'body { margin: 0; }',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Validation Result Structure', () => {
    it('Validation result contains required fields isValid, errors, and warnings', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('Valid EPUB returns empty errors array', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Validation Warnings', () => {
    it('Validation result includes warnings array', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('EPUB with no chapters is valid, but includes a warning', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Empty Book',
        creator: 'Test Author',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata Validation', () => {
    it('Required metadata fields are present in validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      // when
      const metadata = epub.getMetadata();
      const validation = epub.validate();

      // then
      expect(metadata.title).toBeDefined();
      expect(metadata.creator).toBeDefined();
      expect(metadata.language).toBeDefined();
      expect(metadata.identifier).toBeDefined();
      expect(validation.isValid).toBe(true);
    });

    it('Parsed EPUB has valid metadata', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata.title).toBeDefined();
      expect(metadata.title.length).toBeGreaterThan(0);
      expect(metadata.creator).toBeDefined();
      expect(metadata.creator.length).toBeGreaterThan(0);
      expect(metadata.language).toBeDefined();
      expect(metadata.language).toBeDefined();
      expect(metadata.language!.length).toBeGreaterThan(0);
    });
  });

  describe('Chapter Structure Validation', () => {
    it('Chapter hierarchy is validated correctly', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Hierarchical Book',
        creator: 'Test Author',
      });

      const part1 = epub.addChapter({
        title: 'Part I',
        content: '<p>Part content</p>',
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

      // when
      const validation = epub.validate();
      const rootChapters = epub.getRootChapters();

      // then
      expect(validation.isValid).toBe(true);
      expect(rootChapters).toHaveLength(1);
      expect(rootChapters[0].children).toHaveLength(1);
      expect(rootChapters[0].children[0].children).toHaveLength(1);
    });

    it('Chapter without content (section heading) passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Book with Sections',
        creator: 'Test Author',
      });

      const sectionId = epub.addChapter({
        title: 'Section Heading',
        headingLevel: 1,
      });

      epub.addChapter({
        title: 'Subsection',
        parentId: sectionId,
        content: '<p>Content here</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Validation After Modifications', () => {
    it('EPUB remains valid after adding chapters', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);
      let validation = epub.validate();
      expect(validation.isValid).toBe(true);

      // when
      epub.addChapter({
        title: 'New Chapter',
        content: '<p>New content</p>',
      });
      validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
    });

    it('EPUB remains valid after updating metadata', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.setMetadata({
        description: 'Updated description',
        publisher: 'New Publisher',
      });
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
    });

    it('EPUB remains valid after adding images', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.addImage({
        filename: 'new-image.jpg',
        data: Buffer.from('image-data'),
        alt: 'New Image',
      });
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
    });

    it('EPUB remains valid after appending to chapter', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      // when
      if (chapters.length > 0) {
        epub.appendToChapter(chapters[0].id, '<p>Appended content</p>');
        const validation = epub.validate();

        // then
        expect(validation.isValid).toBe(true);
      }

      expect(true).toBe(true);
    });
  });

  describe('Complex EPUB Validation', () => {
    it('Complex EPUB with multiple features passes validation', () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Complex Book',
        creator: 'Test Author',
        language: 'en',
        publisher: 'Test Publisher',
        description: 'A complex test book',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      epub.addStylesheet({
        filename: 'custom.css',
        content: 'p { margin: 1em 0; }',
      });

      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-data'),
        alt: 'Cover',
        isCover: true,
      });

      epub.addImage({
        filename: 'diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Diagram',
      });

      epub.addChapter({
        title: 'Introduction',
        content: '<p>Introduction text</p>',
      });

      const part1 = epub.addChapter({
        title: 'Part I: Basics',
        content: '<p>Part I introduction</p>',
      });

      epub.addChapter({
        title: 'Chapter 1',
        parentId: part1,
        content: '<p>Chapter 1 content</p>',
      });

      const chapter2 = epub.addChapter({
        title: 'Chapter 2',
        parentId: part1,
        content: '<p>Chapter 2 content</p>',
      });

      epub.addChapter({
        title: 'Section 2.1',
        parentId: chapter2,
        content: '<p>Section 2.1 content</p>',
      });

      const part2 = epub.addChapter({
        title: 'Part II: Advanced',
        content: '<p>Part II introduction</p>',
      });

      epub.addChapter({
        title: 'Chapter 3',
        parentId: part2,
        content: '<p>Chapter 3 content</p>',
      });

      epub.addChapter({
        title: 'Conclusion',
        content: '<p>Conclusion text</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('Complex parsed and modified EPUB passes validation', async () => {
      // given
      const epub = await EPUB2Builder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.setMetadata({
        description: 'Modified description',
        publisher: 'Modified Publisher',
      });

      epub.addChapter({
        title: 'Bonus Chapter',
        content: '<p>Bonus content</p>',
      });

      epub.addImage({
        filename: 'bonus-image.jpg',
        data: Buffer.from('bonus-image-data'),
        alt: 'Bonus Image',
      });

      epub.addStylesheet({
        filename: 'bonus-style.css',
        content: '.bonus { color: blue; }',
      });

      const chapters = epub.getAllChapters();
      if (chapters.length > 0) {
        epub.appendToChapter(chapters[0].id, '<p>Appended text</p>');
      }

      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Export and Validate', () => {
    it('Exported EPUB is validated successfully after parsing', async () => {
      // given
      const epub = new EPUB2Builder({
        title: 'Export Validation Test',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);

      // when
      const outputPath = path.join(TEMP_DIR, 'validated-export.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      const parsedEpub = await EPUB2Builder.parse(outputPath);
      const parsedValidation = parsedEpub.validate();

      // then
      expect(fileExists).toBe(true);
      expect(parsedValidation.isValid).toBe(true);
    });
  });
});
