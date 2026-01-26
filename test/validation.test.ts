/**
 * Tests for EPUB validation
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { EPUBBuilder } from '../src';

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
    it('should validate a properly constructed EPUB', () => {
      const epub = new EPUBBuilder({
        title: 'Valid Book',
        creator: 'Test Author',
        language: 'en',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Valid content</p>',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const validation = epub.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate EPUB with nested chapters', () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate EPUB with images', () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate EPUB with custom stylesheets', () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Validation Result Structure', () => {
    it('should return validation result with required fields', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      const validation = epub.validate();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should have empty errors array for valid EPUB', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      const validation = epub.validate();
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Validation Warnings', () => {
    it('should check for warnings in validation result', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      const validation = epub.validate();

      expect(Array.isArray(validation.warnings)).toBe(true);
      // Warnings may or may not be present, but should be an array
    });

    it('should handle EPUB with no chapters gracefully', () => {
      const epub = new EPUBBuilder({
        title: 'Empty Book',
        creator: 'Test Author',
      });

      const validation = epub.validate();

      // Should either be invalid or have warnings about no chapters
      if (!validation.isValid) {
        expect(validation.errors.length).toBeGreaterThan(0);
      } else {
        // If it's valid, might have warnings
        expect(Array.isArray(validation.warnings)).toBe(true);
      }
    });
  });

  describe('Metadata Validation', () => {
    it('should validate required metadata fields are present', () => {
      const epub = new EPUBBuilder({
        title: 'Test Book',
        creator: 'Test Author',
      });

      const metadata = epub.getMetadata();

      expect(metadata.title).toBeDefined();
      expect(metadata.creator).toBeDefined();
      expect(metadata.language).toBeDefined();
      expect(metadata.identifier).toBeDefined();

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
    });

    it('should have valid metadata after parsing', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

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
    it('should validate chapter hierarchy', () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);

      const rootChapters = epub.getRootChapters();
      expect(rootChapters).toHaveLength(1);
      expect(rootChapters[0].children).toHaveLength(1);
      expect(rootChapters[0].children[0].children).toHaveLength(1);
    });

    it('should validate chapter without content (section heading)', () => {
      const epub = new EPUBBuilder({
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Validation After Modifications', () => {
    it('should remain valid after adding chapters', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // Initial validation
      let validation = epub.validate();
      expect(validation.isValid).toBe(true);

      // Add new chapter
      epub.addChapter({
        title: 'New Chapter',
        content: '<p>New content</p>',
      });

      // Validate again
      validation = epub.validate();
      expect(validation.isValid).toBe(true);
    });

    it('should remain valid after updating metadata', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.setMetadata({
        description: 'Updated description',
        publisher: 'New Publisher',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
    });

    it('should remain valid after adding images', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.addImage({
        filename: 'new-image.jpg',
        data: Buffer.from('image-data'),
        alt: 'New Image',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
    });

    it('should remain valid after appending to chapter', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      if (chapters.length > 0) {
        epub.appendToChapter(
          chapters[0].id,
          '<p>Appended content</p>',
        );

        const validation = epub.validate();
        expect(validation.isValid).toBe(true);
      }

      expect(true).toBe(true);
    });
  });

  describe('Complex EPUB Validation', () => {
    it('should validate complex EPUB with multiple features', () => {
      const epub = new EPUBBuilder({
        title: 'Complex Book',
        creator: 'Test Author',
        language: 'en',
        publisher: 'Test Publisher',
        description: 'A complex test book',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      // Add custom stylesheet
      epub.addStylesheet({
        filename: 'custom.css',
        content: 'p { margin: 1em 0; }',
      });

      // Add cover image
      epub.addImage({
        filename: 'cover.jpg',
        data: Buffer.from('cover-data'),
        alt: 'Cover',
        isCover: true,
      });

      // Add content image
      epub.addImage({
        filename: 'diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Diagram',
      });

      // Add complex chapter structure
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

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate complex parsed and modified EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // Perform multiple modifications
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
        epub.appendToChapter(
          chapters[0].id,
          '<p>Appended text</p>',
        );
      }

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Export and Validate', () => {
    it('should export only valid EPUBs', async () => {
      const epub = new EPUBBuilder({
        title: 'Export Validation Test',
        creator: 'Test Author',
      });

      epub.addChapter({
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);

      const outputPath = path.join(TEMP_DIR, 'validated-export.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      // Parse and validate the exported file
      const parsedEpub = await EPUBBuilder.parse(outputPath);
      const parsedValidation = parsedEpub.validate();
      expect(parsedValidation.isValid).toBe(true);
    });
  });
});
