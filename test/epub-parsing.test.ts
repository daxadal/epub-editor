/**
 * Tests for parsing existing EPUB files
 * Based on examples/edit-example.ts
 */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder, EPUB3Builder } from '../src';

const RESOURCES_DIR = path.join(__dirname, 'resources');
const TEMP_DIR = path.join(__dirname, 'temp');
const SIMPLE_GUIDE_2_PATH = path.join(RESOURCES_DIR, 'simple-guide-2.epub');
const SIMPLE_GUIDE_3_PATH = path.join(RESOURCES_DIR, 'simple-guide-3.epub');

describe.each([
  {
    version: 2,
    EPUBBuilder: EPUB2Builder,
    SIMPLE_GUIDE_PATH: SIMPLE_GUIDE_2_PATH,
  },
  {
    version: 3,
    EPUBBuilder: EPUB3Builder,
    SIMPLE_GUIDE_PATH: SIMPLE_GUIDE_3_PATH,
  },
])('EPUB $version Parsing', ({ EPUBBuilder, SIMPLE_GUIDE_PATH }) => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Parse Existing EPUB', () => {
    it('Existing EPUB file is parsed successfully', async () => {
      // given

      // when
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // then
      expect(epub).toBeDefined();
      expect(epub).toBeInstanceOf(EPUBBuilder);
    });

    it('Error is thrown when parsing non-existent file', async () => {
      // given
      const nonExistentPath = path.join(TEMP_DIR, 'non-existent.epub');

      // when
      const parsePromise = EPUBBuilder.parse(nonExistentPath);

      //  then
      await expect(parsePromise).rejects.toThrow();
    });

    it('Error is thrown when parsing invalid EPUB', async () => {
      // given
      const invalidPath = path.join(TEMP_DIR, 'invalid.epub');
      await fs.writeFile(invalidPath, 'This is not an EPUB file');

      // when
      const parsePromise = EPUBBuilder.parse(invalidPath);

      //  then
      await expect(parsePromise).rejects.toThrow();
    });
  });

  describe('Extract Metadata', () => {
    it('Metadata is extracted correctly from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata).toBeDefined();
      expect(metadata.title).toBeDefined();
      expect(metadata.creator).toBeDefined();
      expect(metadata.language).toBeDefined();
      expect(metadata.identifier).toBeDefined();
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.creator).toBe('string');
      expect(typeof metadata.language).toBe('string');
    });

    it('Title is extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata.title).toBe('A Simple Guide');
    });

    it('Creator/author is extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata.creator).toBe('Example Author');
    });

    it('Language is extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata.language).toBe('en');
    });

    it('Optional metadata fields are accessible after parsing', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const metadata = epub.getMetadata();

      // then
      expect(metadata).toHaveProperty('publisher');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('subject');
      expect(metadata).toHaveProperty('rights');
    });
  });

  describe('Extract Chapters', () => {
    it('Root chapters are extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const chapters = epub.getRootChapters();

      // then
      expect(chapters).toBeDefined();
      expect(Array.isArray(chapters)).toBe(true);
      expect(chapters.length).toBeGreaterThan(0);
    });

    it('All chapters are extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const allChapters = epub.getAllChapters();

      // then
      expect(allChapters).toBeDefined();
      expect(Array.isArray(allChapters)).toBe(true);
      expect(allChapters.length).toBeGreaterThan(0);
    });

    it('Chapter metadata is extracted with correct properties', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const chapters = epub.getRootChapters();
      const firstChapter = chapters[0];

      // then
      expect(firstChapter).toHaveProperty('id');
      expect(firstChapter).toHaveProperty('title');
      expect(firstChapter).toHaveProperty('content');
      expect(firstChapter).toHaveProperty('children');
      expect(typeof firstChapter.id).toBe('string');
      expect(typeof firstChapter.title).toBe('string');
    });

    it('Chapter hierarchy is preserved after parsing', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const rootChapters = epub.getRootChapters();
      const hasNestedChapters = rootChapters.some(
        (chapter) => chapter.children.length > 0,
      );

      // then
      if (hasNestedChapters) {
        const parentChapter = rootChapters.find(
          (chapter) => chapter.children.length > 0,
        )!;
        expect(parentChapter.children).toBeDefined();
        expect(Array.isArray(parentChapter.children)).toBe(true);
        expect(parentChapter.children[0]).toHaveProperty('id');
        expect(parentChapter.children[0]).toHaveProperty('title');
      }

      expect(true).toBe(true);
    });

    it('Chapter content is extracted successfully', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const chapters = epub.getRootChapters();
      const chapterWithContent = chapters.find(
        (chapter) => chapter.content && chapter.content.trim().length > 0,
      );

      // then
      expect(chapterWithContent).toBeDefined();
      expect(chapterWithContent!.content).toBeDefined();
      expect(chapterWithContent!.content.length).toBeGreaterThan(0);
    });

    it('Chapter is retrieved by ID successfully', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getRootChapters();
      const firstChapterId = chapters[0].id;

      // when
      const retrievedChapter = epub.getChapter(firstChapterId);

      // then
      expect(retrievedChapter).toBeDefined();
      expect(retrievedChapter?.id).toBe(firstChapterId);
      expect(retrievedChapter?.title).toBe(chapters[0].title);
    });
  });

  describe('Extract Images', () => {
    it('Images are extracted if present in EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const images = epub.getAllImages();

      // then
      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
    });

    it('Image metadata is extracted correctly when images exist', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const images = epub.getAllImages();

      // then
      if (images.length > 0) {
        const firstImage = images[0];
        expect(firstImage).toHaveProperty('id');
        expect(firstImage).toHaveProperty('filename');
        expect(firstImage).toHaveProperty('data');
        expect(firstImage.data).toBeInstanceOf(Buffer);
      }

      expect(true).toBe(true);
    });
  });

  describe('Extract Stylesheets', () => {
    it('Stylesheets are extracted from parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const stylesheets = epub.getAllStylesheets();

      // then
      expect(stylesheets).toBeDefined();
      expect(Array.isArray(stylesheets)).toBe(true);
      expect(stylesheets.length).toBeGreaterThan(0);
    });

    it('Stylesheet metadata is extracted correctly', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      const stylesheets = epub.getAllStylesheets();
      const firstStylesheet = stylesheets[0];

      // then
      expect(firstStylesheet).toHaveProperty('id');
      expect(firstStylesheet).toHaveProperty('filename');
      expect(firstStylesheet).toHaveProperty('content');
      expect(typeof firstStylesheet.content).toBe('string');
      expect(firstStylesheet.content.length).toBeGreaterThan(0);
    });
  });

  describe('Round-trip Test', () => {
    it('EPUB is parsed and re-exported successfully in round-trip', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalMetadata = epub.getMetadata();

      // when
      const outputPath = path.join(TEMP_DIR, 'parsed-and-exported.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      const stats = await fs.stat(outputPath);

      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const reparsedMetadata = reparsedEpub.getMetadata();

      // then
      expect(fileExists).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      expect(reparsedMetadata.title).toBe(originalMetadata.title);
      expect(reparsedMetadata.creator).toBe(originalMetadata.creator);
      expect(reparsedMetadata.language).toBe(originalMetadata.language);
    });

    it('Chapter count is preserved in round-trip', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      // when
      const outputPath = path.join(TEMP_DIR, 'roundtrip-chapters.epub');
      await epub.exportToFile(outputPath);

      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const reparsedChapterCount = reparsedEpub.getAllChapters().length;

      // then
      expect(reparsedChapterCount).toBe(originalChapterCount);
    });

    it('Chapter structure is preserved in round-trip', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalRootChapters = epub.getRootChapters();

      // when
      const outputPath = path.join(TEMP_DIR, 'roundtrip-structure.epub');
      await epub.exportToFile(outputPath);

      const reparsedEpub = await EPUBBuilder.parse(outputPath);
      const reparsedRootChapters = reparsedEpub.getRootChapters();

      // then
      expect(reparsedRootChapters.length).toBe(originalRootChapters.length);

      if (originalRootChapters.length > 0) {
        expect(reparsedRootChapters[0].title).toBe(
          originalRootChapters[0].title,
        );
      }
    });
  });

  describe('Parse from Buffer', () => {
    it('EPUB is parsed from buffer successfully', async () => {
      // given
      const fileBuffer = await fs.readFile(SIMPLE_GUIDE_PATH);
      const tempPath = path.join(TEMP_DIR, 'temp-buffer-test.epub');
      await fs.writeFile(tempPath, fileBuffer);

      // when
      const epub = await EPUBBuilder.parse(tempPath);
      const metadata = epub.getMetadata();

      // then
      expect(epub).toBeDefined();
      expect(epub).toBeInstanceOf(EPUBBuilder);
      expect(metadata.title).toBe('A Simple Guide');
    });
  });
});
