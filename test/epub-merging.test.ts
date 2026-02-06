/**
 * Tests for merging multiple EPUB files
 * Based on examples/merge-example.ts
 */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder, EPUB3Builder } from '../src';

import { getTestEpub } from './resources/epub-merging.utils';

export const TEMP_DIR = path.join(__dirname, 'temp');

describe.each([
  { version: 2, EPUBBuilder: EPUB2Builder },
  { version: 3, EPUBBuilder: EPUB3Builder },
])('EPUB $version Merging', ({ EPUBBuilder }) => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Basic Merging', () => {
    it('Two EPUBs are merged with all chapters preserved', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'book1.epub',
        title: 'Book 1',
        creator: 'Author A',
        chapters: [
          { title: 'Chapter 1', content: '<p>Book 1, Chapter 1</p>' },
          { title: 'Chapter 2', content: '<p>Book 1, Chapter 2</p>' },
        ],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'book2.epub',
        title: 'Book 2',
        creator: 'Author A',
        chapters: [
          { title: 'Chapter 1', content: '<p>Book 2, Chapter 1</p>' },
          { title: 'Chapter 2', content: '<p>Book 2, Chapter 2</p>' },
        ],
      });

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Complete Series',
        creator: 'Author A',
        language: 'en',
        description: 'Books 1 and 2 combined',
      });

      const book1Section = mergedEpub.addChapter({
        title: 'Book 1',
        headingLevel: 1,
      });

      const book1Chapters = epub1.getRootChapters();
      for (const chapter of book1Chapters) {
        mergedEpub.addChapter({
          title: chapter.title,
          content: chapter.content,
          parentId: book1Section,
        });
      }

      const book2Section = mergedEpub.addChapter({
        title: 'Book 2',
        headingLevel: 1,
      });

      const book2Chapters = epub2.getRootChapters();
      for (const chapter of book2Chapters) {
        mergedEpub.addChapter({
          title: chapter.title,
          content: chapter.content,
          parentId: book2Section,
        });
      }

      const outputPath = path.join(TEMP_DIR, 'merged-basic.epub');
      await mergedEpub.exportToFile(outputPath);

      // then
      const validation = mergedEpub.validate();
      expect(validation.isValid).toBe(true);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const rootChapters = mergedEpub.getRootChapters();
      expect(rootChapters).toHaveLength(2);
      expect(rootChapters[0].title).toBe('Book 1');
      expect(rootChapters[1].title).toBe('Book 2');
      expect(rootChapters[0].children).toHaveLength(2);
      expect(rootChapters[1].children).toHaveLength(2);
    });

    it('Three EPUBs are merged into a single book', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'trilogy-1.epub',
        title: 'Trilogy: Part 1',
        creator: 'Author B',
        chapters: [{ title: 'Chapter 1', content: '<p>Part 1 content</p>' }],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'trilogy-2.epub',
        title: 'Trilogy: Part 2',
        creator: 'Author B',
        chapters: [{ title: 'Chapter 1', content: '<p>Part 2 content</p>' }],
      });

      const epub3 = getTestEpub(EPUBBuilder, {
        filename: 'trilogy-3.epub',
        title: 'Trilogy: Part 3',
        creator: 'Author B',
        chapters: [{ title: 'Chapter 1', content: '<p>Part 3 content</p>' }],
      });

      const sourceEPUBs = [epub1, epub2, epub3];

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Complete Trilogy',
        creator: 'Author B',
        language: 'en',
      });

      for (const source of sourceEPUBs) {
        const sectionId = mergedEpub.addChapter({
          title: source.getMetadata().title,
          headingLevel: 1,
        });

        const chapters = source.getRootChapters();
        for (const chapter of chapters) {
          mergedEpub.addChapter({
            title: chapter.title,
            content: chapter.content,
            parentId: sectionId,
          });
        }
      }

      // then
      const rootChapters = mergedEpub.getRootChapters();
      expect(rootChapters).toHaveLength(3);
    });
  });

  describe('Merge with Images', () => {
    it('EPUBs with images are merged with unique image filenames', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'book-with-image-1.epub',
        title: 'Book with Image 1',
        creator: 'Author C',
        chapters: [
          {
            title: 'Chapter 1',
            content:
              '<p>Content with image</p><img src="../images/image1.jpg" alt="Image 1" />',
          },
        ],
        images: [
          {
            filename: 'image1.jpg',
            data: Buffer.from('image1-data'),
            alt: 'Image 1',
          },
        ],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'book-with-image-2.epub',
        title: 'Book with Image 2',
        creator: 'Author C',
        chapters: [
          {
            title: 'Chapter 1',
            content:
              '<p>Content with different image</p><img src="../images/image2.png" alt="Image 2" />',
          },
        ],
        images: [
          {
            filename: 'image2.png',
            data: Buffer.from('image2-data'),
            alt: 'Image 2',
          },
        ],
      });

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Books with Images Combined',
        creator: 'Author C',
        language: 'en',
      });

      const images1 = epub1.getAllImages();
      for (const image of images1) {
        mergedEpub.addImage({
          filename: `book1-${image.filename}`,
          data: image.data,
          alt: image.alt,
        });
      }

      const images2 = epub2.getAllImages();
      for (const image of images2) {
        mergedEpub.addImage({
          filename: `book2-${image.filename}`,
          data: image.data,
          alt: image.alt,
        });
      }

      const section1 = mergedEpub.addChapter({
        title: 'Book 1',
        headingLevel: 1,
      });
      const section2 = mergedEpub.addChapter({
        title: 'Book 2',
        headingLevel: 1,
      });

      epub1.getRootChapters().forEach((chapter) => {
        mergedEpub.addChapter({
          title: chapter.title,
          content: chapter.content,
          parentId: section1,
        });
      });

      epub2.getRootChapters().forEach((chapter) => {
        mergedEpub.addChapter({
          title: chapter.title,
          content: chapter.content,
          parentId: section2,
        });
      });

      // then
      const allImages = mergedEpub.getAllImages();
      expect(allImages.length).toBeGreaterThanOrEqual(2);
    });

    it('Duplicate images are renamed to avoid conflicts when merging', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'dup-image-1.epub',
        title: 'Book 1',
        creator: 'Author D',
        chapters: [{ title: 'Chapter 1', content: '<p>Content 1</p>' }],
        images: [
          {
            filename: 'diagram.png',
            data: Buffer.from('diagram-version-1'),
            alt: 'Diagram 1',
          },
        ],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'dup-image-2.epub',
        title: 'Book 2',
        creator: 'Author D',
        chapters: [{ title: 'Chapter 1', content: '<p>Content 2</p>' }],
        images: [
          {
            filename: 'diagram.png',
            data: Buffer.from('diagram-version-2'),
            alt: 'Diagram 2',
          },
        ],
      });

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Merged with Duplicate Images',
        creator: 'Author D',
        language: 'en',
      });

      const images1 = epub1.getAllImages();
      for (const image of images1) {
        mergedEpub.addImage({
          filename: `book1-${image.filename}`,
          data: image.data,
          alt: image.alt,
        });
      }

      const images2 = epub2.getAllImages();
      for (const image of images2) {
        mergedEpub.addImage({
          filename: `book2-${image.filename}`,
          data: image.data,
          alt: image.alt,
        });
      }

      // then
      const allImages = mergedEpub.getAllImages();
      expect(allImages).toHaveLength(2);

      const filenames = allImages.map((img) => img.filename);
      expect(filenames).toContain('images/book1-images-diagram.png');
      expect(filenames).toContain('images/book2-images-diagram.png');
    });
  });

  describe('Merge with Stylesheets', () => {
    it('EPUBs with custom stylesheets are merged successfully', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'book-style-1.epub',
        title: 'Book with Style 1',
        creator: 'Author E',
        chapters: [{ title: 'Chapter 1', content: '<p>Styled content</p>' }],
        stylesheets: [
          {
            filename: 'custom1.css',
            content: 'body { font-family: Arial; }',
          },
        ],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'book-style-2.epub',
        title: 'Book with Style 2',
        creator: 'Author E',
        chapters: [{ title: 'Chapter 1', content: '<p>Different style</p>' }],
        stylesheets: [
          {
            filename: 'custom2.css',
            content: 'body { font-family: Times; }',
          },
        ],
      });

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Merged with Styles',
        creator: 'Author E',
        language: 'en',
      });

      const styles1 = epub1
        .getAllStylesheets()
        .filter((s) => s.id !== 'default-style');
      for (const style of styles1) {
        mergedEpub.addStylesheet({
          filename: `book1-${style.filename}`,
          content: style.content,
        });
      }

      const styles2 = epub2
        .getAllStylesheets()
        .filter((s) => s.id !== 'default-style');
      for (const style of styles2) {
        mergedEpub.addStylesheet({
          filename: `book2-${style.filename}`,
          content: style.content,
        });
      }

      // then
      const allStylesheets = mergedEpub.getAllStylesheets();
      expect(allStylesheets.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Merge Metadata', () => {
    it('Author metadata is combined from multiple books', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'author-book-1.epub',
        title: 'Book 1',
        creator: 'Author A',
        chapters: [{ title: 'Chapter 1', content: '<p>Content</p>' }],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'author-book-2.epub',
        title: 'Book 2',
        creator: 'Author B',
        chapters: [{ title: 'Chapter 1', content: '<p>Content</p>' }],
      });

      const authors = new Set<string>();
      authors.add(epub1.getMetadata().creator);
      authors.add(epub2.getMetadata().creator);

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Anthology',
        creator: Array.from(authors).join(', '),
        language: 'en',
        description: 'Collection of works by multiple authors',
      });

      // then
      const metadata = mergedEpub.getMetadata();
      expect(metadata.creator).toContain('Author A');
      expect(metadata.creator).toContain('Author B');
    });

    it('Descriptive metadata is created for merged book', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'series-1.epub',
        title: 'Series: Part 1',
        creator: 'Series Author',
        chapters: [{ title: 'Chapter 1', content: '<p>Content</p>' }],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'series-2.epub',
        title: 'Series: Part 2',
        creator: 'Series Author',
        chapters: [{ title: 'Chapter 1', content: '<p>Content</p>' }],
      });

      const titles = [epub1.getMetadata().title, epub2.getMetadata().title];

      // when
      const mergedEpub = new EPUBBuilder({
        title: 'Complete Series',
        creator: 'Series Author',
        language: 'en',
        description: `Complete series containing: ${titles.join('; ')}`,
      });

      // then
      const metadata = mergedEpub.getMetadata();
      expect(metadata.description).toContain('Series: Part 1');
      expect(metadata.description).toContain('Series: Part 2');
    });
  });

  describe('Export Merged EPUB', () => {
    it('Merged EPUB is exported successfully with valid structure', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'export-merge-1.epub',
        title: 'Export Book 1',
        creator: 'Author F',
        chapters: [
          { title: 'Chapter 1', content: '<p>Book 1 content</p>' },
          { title: 'Chapter 2', content: '<p>Book 1 more content</p>' },
        ],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'export-merge-2.epub',
        title: 'Export Book 2',
        creator: 'Author F',
        chapters: [
          { title: 'Chapter 1', content: '<p>Book 2 content</p>' },
          { title: 'Chapter 2', content: '<p>Book 2 more content</p>' },
        ],
      });

      const mergedEpub = new EPUBBuilder({
        title: 'Merged Export Test',
        creator: 'Author F',
        language: 'en',
      });

      const section1 = mergedEpub.addChapter({
        title: 'Book 1',
        headingLevel: 1,
      });
      epub1.getRootChapters().forEach((ch) => {
        mergedEpub.addChapter({
          title: ch.title,
          content: ch.content,
          parentId: section1,
        });
      });

      const section2 = mergedEpub.addChapter({
        title: 'Book 2',
        headingLevel: 1,
      });
      epub2.getRootChapters().forEach((ch) => {
        mergedEpub.addChapter({
          title: ch.title,
          content: ch.content,
          parentId: section2,
        });
      });

      // when
      const outputPath = path.join(TEMP_DIR, 'merged-export.epub');
      await mergedEpub.exportToFile(outputPath);

      // then
      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);

      const parsedMerged = await EPUBBuilder.parse(outputPath);
      expect(parsedMerged.getRootChapters().length).toBeGreaterThanOrEqual(2);
      expect(parsedMerged.getAllChapters().length).toBeGreaterThan(2);
    });

    it('Merged EPUB is validated before export', async () => {
      // given
      const epub1 = getTestEpub(EPUBBuilder, {
        filename: 'validate-merge-1.epub',
        title: 'Validate Book 1',
        creator: 'Author G',
        chapters: [{ title: 'Chapter 1', content: '<p>Content 1</p>' }],
      });

      const epub2 = getTestEpub(EPUBBuilder, {
        filename: 'validate-merge-2.epub',
        title: 'Validate Book 2',
        creator: 'Author G',
        chapters: [{ title: 'Chapter 1', content: '<p>Content 2</p>' }],
      });

      const mergedEpub = new EPUBBuilder({
        title: 'Merged Validation Test',
        creator: 'Author G',
        language: 'en',
      });

      const section1 = mergedEpub.addChapter({
        title: 'Book 1',
        headingLevel: 1,
      });
      epub1.getRootChapters().forEach((ch) => {
        mergedEpub.addChapter({
          title: ch.title,
          content: ch.content,
          parentId: section1,
        });
      });

      const section2 = mergedEpub.addChapter({
        title: 'Book 2',
        headingLevel: 1,
      });
      epub2.getRootChapters().forEach((ch) => {
        mergedEpub.addChapter({
          title: ch.title,
          content: ch.content,
          parentId: section2,
        });
      });

      // when
      const validation = mergedEpub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
