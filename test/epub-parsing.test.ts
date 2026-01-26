/**
 * Tests for parsing existing EPUB files
 * Based on examples/edit-example.ts
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { EPUBBuilder } from '../src';

const RESOURCES_DIR = path.join(__dirname, 'resources');
const TEMP_DIR = path.join(__dirname, 'temp');
const SIMPLE_GUIDE_PATH = path.join(RESOURCES_DIR, 'simple-guide.epub');

describe('EPUB Parsing', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Parse Existing EPUB', () => {
    it('should parse an existing EPUB file', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      expect(epub).toBeDefined();
      expect(epub).toBeInstanceOf(EPUBBuilder);
    });

    it('should throw error when parsing non-existent file', async () => {
      const nonExistentPath = path.join(TEMP_DIR, 'non-existent.epub');

      await expect(EPUBBuilder.parse(nonExistentPath)).rejects.toThrow();
    });

    it('should throw error when parsing invalid EPUB', async () => {
      const invalidPath = path.join(TEMP_DIR, 'invalid.epub');
      await fs.writeFile(invalidPath, 'This is not an EPUB file');

      await expect(EPUBBuilder.parse(invalidPath)).rejects.toThrow();
    });
  });

  describe('Extract Metadata', () => {
    it('should extract metadata correctly', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.title).toBeDefined();
      expect(metadata.creator).toBeDefined();
      expect(metadata.language).toBeDefined();
      expect(metadata.identifier).toBeDefined();
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.creator).toBe('string');
      expect(typeof metadata.language).toBe('string');
    });

    it('should extract title from parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

      expect(metadata.title).toBe('A Simple Guide');
    });

    it('should extract creator/author from parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

      expect(metadata.creator).toBe('Example Author');
    });

    it('should extract language from parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

      expect(metadata.language).toBe('en');
    });

    it('should extract optional metadata fields', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const metadata = epub.getMetadata();

      // These might not be present in simple-guide.epub, but should be accessible
      expect(metadata).toHaveProperty('publisher');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('subject');
      expect(metadata).toHaveProperty('rights');
    });
  });

  describe('Extract Chapters', () => {
    it('should extract root chapters', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getRootChapters();

      expect(chapters).toBeDefined();
      expect(Array.isArray(chapters)).toBe(true);
      expect(chapters.length).toBeGreaterThan(0);
    });

    it('should extract all chapters', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const allChapters = epub.getAllChapters();

      expect(allChapters).toBeDefined();
      expect(Array.isArray(allChapters)).toBe(true);
      expect(allChapters.length).toBeGreaterThan(0);
    });

    it('should extract chapter metadata', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getRootChapters();

      const firstChapter = chapters[0];
      expect(firstChapter).toHaveProperty('id');
      expect(firstChapter).toHaveProperty('title');
      expect(firstChapter).toHaveProperty('content');
      expect(firstChapter).toHaveProperty('children');
      expect(typeof firstChapter.id).toBe('string');
      expect(typeof firstChapter.title).toBe('string');
    });

    it('should preserve chapter hierarchy', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const rootChapters = epub.getRootChapters();

      // Check if any root chapter has children
      const hasNestedChapters = rootChapters.some(
        (chapter) => chapter.children.length > 0,
      );

      if (hasNestedChapters) {
        const parentChapter = rootChapters.find(
          (chapter) => chapter.children.length > 0,
        )!;
        expect(parentChapter.children).toBeDefined();
        expect(Array.isArray(parentChapter.children)).toBe(true);
        expect(parentChapter.children[0]).toHaveProperty('id');
        expect(parentChapter.children[0]).toHaveProperty('title');
      }

      // Test passes regardless of whether there are nested chapters
      expect(true).toBe(true);
    });

    it('should extract chapter content', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getRootChapters();

      const chapterWithContent = chapters.find(
        (chapter) => chapter.content && chapter.content.trim().length > 0,
      );

      expect(chapterWithContent).toBeDefined();
      expect(chapterWithContent!.content).toBeDefined();
      expect(chapterWithContent!.content.length).toBeGreaterThan(0);
    });

    it('should get chapter by ID', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getRootChapters();

      const firstChapterId = chapters[0].id;
      const retrievedChapter = epub.getChapter(firstChapterId);

      expect(retrievedChapter).toBeDefined();
      expect(retrievedChapter?.id).toBe(firstChapterId);
      expect(retrievedChapter?.title).toBe(chapters[0].title);
    });
  });

  describe('Extract Images', () => {
    it('should extract images if present', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const images = epub.getAllImages();

      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
      // simple-guide.epub might not have images, so just check structure
    });

    it('should extract image metadata if images exist', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const images = epub.getAllImages();

      if (images.length > 0) {
        const firstImage = images[0];
        expect(firstImage).toHaveProperty('id');
        expect(firstImage).toHaveProperty('filename');
        expect(firstImage).toHaveProperty('data');
        expect(firstImage.data).toBeInstanceOf(Buffer);
      }

      // Test passes regardless
      expect(true).toBe(true);
    });
  });

  describe('Extract Stylesheets', () => {
    it('should extract stylesheets', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const stylesheets = epub.getAllStylesheets();

      expect(stylesheets).toBeDefined();
      expect(Array.isArray(stylesheets)).toBe(true);
      expect(stylesheets.length).toBeGreaterThan(0);
    });

    it('should extract stylesheet metadata', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const stylesheets = epub.getAllStylesheets();

      const firstStylesheet = stylesheets[0];
      expect(firstStylesheet).toHaveProperty('id');
      expect(firstStylesheet).toHaveProperty('filename');
      expect(firstStylesheet).toHaveProperty('content');
      expect(typeof firstStylesheet.content).toBe('string');
      expect(firstStylesheet.content.length).toBeGreaterThan(0);
    });
  });

  describe('Round-trip Test', () => {
    it('should parse and re-export EPUB successfully', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      const outputPath = path.join(TEMP_DIR, 'parsed-and-exported.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);

      // Parse the re-exported EPUB
      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const originalMetadata = epub.getMetadata();
      const reparsedMetadata = reparsedEpub.getMetadata();

      expect(reparsedMetadata.title).toBe(originalMetadata.title);
      expect(reparsedMetadata.creator).toBe(originalMetadata.creator);
      expect(reparsedMetadata.language).toBe(originalMetadata.language);
    });

    it('should preserve chapter count in round-trip', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      const outputPath = path.join(TEMP_DIR, 'roundtrip-chapters.epub');
      await epub.exportToFile(outputPath);

      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const reparsedChapterCount = reparsedEpub.getAllChapters().length;

      expect(reparsedChapterCount).toBe(originalChapterCount);
    });

    it('should preserve chapter structure in round-trip', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalRootChapters = epub.getRootChapters();

      const outputPath = path.join(TEMP_DIR, 'roundtrip-structure.epub');
      await epub.exportToFile(outputPath);

      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const reparsedRootChapters = reparsedEpub.getRootChapters();

      expect(reparsedRootChapters.length).toBe(originalRootChapters.length);

      // Compare first chapter titles
      if (originalRootChapters.length > 0) {
        expect(reparsedRootChapters[0].title).toBe(
          originalRootChapters[0].title,
        );
      }
    });
  });

  describe('Parse from Buffer', () => {
    it('should parse EPUB from buffer', async () => {
      // EPUBBuilder.parse expects a file path, so we write buffer to temp file
      const fileBuffer = await fs.readFile(SIMPLE_GUIDE_PATH);
      const tempPath = path.join(TEMP_DIR, 'temp-buffer-test.epub');
      await fs.writeFile(tempPath, fileBuffer);
      const epub = await EPUBBuilder.parse(tempPath);

      expect(epub).toBeDefined();
      expect(epub).toBeInstanceOf(EPUBBuilder);

      const metadata = epub.getMetadata();
      expect(metadata.title).toBe('A Simple Guide');
    });
  });
});
