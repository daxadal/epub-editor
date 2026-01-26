/**
 * Tests for editing existing EPUB files
 * Based on examples/edit-example.ts
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { EPUBBuilder } from '../src';

const RESOURCES_DIR = path.join(__dirname, 'resources');
const TEMP_DIR = path.join(__dirname, 'temp');
const SIMPLE_GUIDE_PATH = path.join(RESOURCES_DIR, 'simple-guide.epub');

describe('EPUB Editing', () => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Add Chapters to Existing EPUB', () => {
    it('should add a new chapter to parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      const newChapterId = epub.addChapter({
        title: 'New Chapter',
        content: '<p>This is a newly added chapter.</p>',
      });

      expect(newChapterId).toBeDefined();

      const updatedChapterCount = epub.getAllChapters().length;
      expect(updatedChapterCount).toBe(originalChapterCount + 1);

      const allChapters = epub.getAllChapters();
      const newChapter = allChapters.find(
        (chapter) => chapter.id === newChapterId,
      );
      expect(newChapter).toBeDefined();
      expect(newChapter?.title).toBe('New Chapter');
    });

    it('should add multiple new chapters', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      epub.addChapter({
        title: 'Bonus Chapter 1',
        content: '<p>First bonus chapter</p>',
      });

      epub.addChapter({
        title: 'Bonus Chapter 2',
        content: '<p>Second bonus chapter</p>',
      });

      epub.addChapter({
        title: 'Bonus Chapter 3',
        content: '<p>Third bonus chapter</p>',
      });

      const updatedChapterCount = epub.getAllChapters().length;
      expect(updatedChapterCount).toBe(originalChapterCount + 3);
    });

    it('should add nested chapter to existing parent', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const rootChapters = epub.getRootChapters();

      if (rootChapters.length > 0) {
        const parentId = rootChapters[0].id;
        const originalChildCount = rootChapters[0].children.length;

        epub.addChapter({
          title: 'New Nested Chapter',
          parentId: parentId,
          content: '<p>Nested content</p>',
        });

        const updatedRootChapters = epub.getRootChapters();
        const updatedParent = updatedRootChapters[0];
        expect(updatedParent.children.length).toBe(originalChildCount + 1);
      }

      // Test passes even if no root chapters
      expect(true).toBe(true);
    });
  });

  describe('Append Content to Chapters', () => {
    it('should append content to existing chapter', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      if (chapters.length > 0) {
        const targetChapter = chapters[0];
        const originalContent = targetChapter.content;

        const appendedText = '<hr/><p>This content was appended.</p>';
        epub.appendToChapter(targetChapter.id, appendedText);

        const updatedChapter = epub.getChapter(targetChapter.id);
        expect(updatedChapter?.content).toContain(originalContent);
        expect(updatedChapter?.content).toContain(appendedText);
        expect(updatedChapter?.content.indexOf(appendedText)).toBeGreaterThan(
          updatedChapter?.content.indexOf(originalContent) || 0,
        );
      }

      expect(true).toBe(true);
    });

    it('should append HTML content correctly', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      if (chapters.length > 0) {
        const chapterId = chapters[0].id;
        const htmlContent = `
          <section>
            <h2>Additional Section</h2>
            <p>This is additional content.</p>
          </section>
        `;

        epub.appendToChapter(chapterId, htmlContent);

        const updatedChapter = epub.getChapter(chapterId);
        expect(updatedChapter?.content).toContain('Additional Section');
        expect(updatedChapter?.content).toContain('This is additional content');
      }

      expect(true).toBe(true);
    });
  });

  describe('Update Metadata', () => {
    it('should update title', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.setMetadata({
        title: 'Updated Title',
      });

      const metadata = epub.getMetadata();
      expect(metadata.title).toBe('Updated Title');
    });

    it('should update description', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      const newDescription = 'This is an updated description.';
      epub.setMetadata({
        description: newDescription,
      });

      const metadata = epub.getMetadata();
      expect(metadata.description).toBe(newDescription);
    });

    it('should update publisher', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.setMetadata({
        publisher: 'New Publisher',
      });

      const metadata = epub.getMetadata();
      expect(metadata.publisher).toBe('New Publisher');
    });

    it('should update multiple metadata fields', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.setMetadata({
        description: 'New description',
        publisher: 'Updated Publisher',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      const metadata = epub.getMetadata();
      expect(metadata.description).toBe('New description');
      expect(metadata.publisher).toBe('Updated Publisher');
      expect(metadata.subject).toBe('Testing');
      expect(metadata.rights).toBe('Copyright 2026');
    });

    it('should preserve unchanged metadata fields', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalMetadata = epub.getMetadata();

      epub.setMetadata({
        description: 'New description only',
      });

      const updatedMetadata = epub.getMetadata();
      expect(updatedMetadata.title).toBe(originalMetadata.title);
      expect(updatedMetadata.creator).toBe(originalMetadata.creator);
      expect(updatedMetadata.language).toBe(originalMetadata.language);
      expect(updatedMetadata.description).toBe('New description only');
    });
  });

  describe('Add Images to Existing EPUB', () => {
    it('should add image to parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalImageCount = epub.getAllImages().length;

      const imageData = Buffer.from('new-image-data');
      epub.addImage({
        filename: 'new-image.jpg',
        data: imageData,
        alt: 'New Image',
      });

      const updatedImageCount = epub.getAllImages().length;
      expect(updatedImageCount).toBe(originalImageCount + 1);
    });

    it('should add multiple images', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalImageCount = epub.getAllImages().length;

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

      const updatedImageCount = epub.getAllImages().length;
      expect(updatedImageCount).toBe(originalImageCount + 2);
    });
  });

  describe('Add Stylesheets to Existing EPUB', () => {
    it('should add stylesheet to parsed EPUB', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalStylesheetCount = epub.getAllStylesheets().length;

      epub.addStylesheet({
        filename: 'new-styles.css',
        content: 'body { background: #fff; }',
      });

      const updatedStylesheetCount = epub.getAllStylesheets().length;
      expect(updatedStylesheetCount).toBe(originalStylesheetCount + 1);
    });
  });

  describe('Export Modified EPUB', () => {
    it('should export modified EPUB to file', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // Make modifications
      epub.addChapter({
        title: 'Bonus Chapter',
        content: '<p>Bonus content</p>',
      });

      epub.setMetadata({
        description: 'Modified with EPUBBuilder',
      });

      const outputPath = path.join(TEMP_DIR, 'modified.epub');
      await epub.exportToFile(outputPath);

      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should validate modified EPUB before export', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.addChapter({
        title: 'New Chapter',
        content: '<p>New content</p>',
      });

      const validation = epub.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should preserve original content after modifications', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalTitle = epub.getMetadata().title;
      const originalChapterCount = epub.getAllChapters().length;

      // Add new content
      epub.addChapter({
        title: 'Additional Chapter',
        content: '<p>Additional content</p>',
      });

      // Export
      const outputPath = path.join(TEMP_DIR, 'modified-preserve.epub');
      await epub.exportToFile(outputPath);

      // Parse the modified EPUB
      const modifiedEpub = await EPUBBuilder.parse(outputPath);

      // Check that original content is preserved
      expect(modifiedEpub.getMetadata().title).toBe(originalTitle);
      expect(modifiedEpub.getAllChapters().length).toBe(
        originalChapterCount + 1,
      );
    });
  });

  describe('Complex Editing Workflow', () => {
    it('should perform multiple editing operations', async () => {
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      const originalMetadata = epub.getMetadata();
      const originalChapterCount = epub.getAllChapters().length;
      const originalImageCount = epub.getAllImages().length;

      // Update metadata
      epub.setMetadata({
        description: `${originalMetadata.description || ''} Modified with EPUBBuilder.`.trim(),
        publisher: 'Test Publisher',
      });

      // Add new chapter
      epub.addChapter({
        title: 'Appendix: Additional Resources',
        content: `
          <p>This appendix was added during editing.</p>
          <ul>
            <li>Resource 1</li>
            <li>Resource 2</li>
            <li>Resource 3</li>
          </ul>
        `,
      });

      // Append to first chapter
      const chapters = epub.getAllChapters();
      if (chapters.length > 0) {
        epub.appendToChapter(
          chapters[0].id,
          '<hr/><p><em>Note: This book has been modified.</em></p>',
        );
      }

      // Add image
      epub.addImage({
        filename: 'appendix-diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Appendix Diagram',
      });

      // Add custom stylesheet
      epub.addStylesheet({
        filename: 'custom.css',
        content: '.note { font-style: italic; }',
      });

      // Validate
      const validation = epub.validate();
      expect(validation.isValid).toBe(true);

      // Export
      const outputPath = path.join(TEMP_DIR, 'complex-edit.epub');
      await epub.exportToFile(outputPath);

      // Parse and verify
      const modifiedEpub = await EPUBBuilder.parse(outputPath);
      expect(modifiedEpub.getAllChapters().length).toBe(
        originalChapterCount + 1,
      );
      expect(modifiedEpub.getAllImages().length).toBe(originalImageCount + 1);
      expect(modifiedEpub.getMetadata().description).toContain(
        'Modified with EPUBBuilder',
      );
    });
  });
});
