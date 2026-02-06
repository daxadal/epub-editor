/**
 * Tests for editing existing EPUB files
 * Based on examples/edit-example.ts
 */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder, EPUB3Builder } from '../src';

const RESOURCES_DIR = path.join(__dirname, 'resources');
const TEMP_DIR = path.join(__dirname, 'temp');
const SIMPLE_GUIDE_PATH = path.join(RESOURCES_DIR, 'simple-guide.epub');

describe.each([
  { version: 2, EPUBBuilder: EPUB2Builder },
  { version: 3, EPUBBuilder: EPUB3Builder },
])('EPUB $version Editing', ({ EPUBBuilder }) => {
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('Add Chapters to Existing EPUB', () => {
    it('A new chapter is accesible when added to parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      // when
      const newChapterId = epub.addChapter({
        title: 'New Chapter',
        content: '<p>This is a newly added chapter.</p>',
      });

      // then
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

    it('The new chapters are accesible when multiple ones are added to parsed EPUB', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalChapterCount = epub.getAllChapters().length;

      // when
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

      // then
      const updatedChapterCount = epub.getAllChapters().length;
      expect(updatedChapterCount).toBe(originalChapterCount + 3);
    });

    it('The new chapter is present as child when added to a parent', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const rootChapters = epub.getRootChapters();

      const parentId = rootChapters[0].id;
      const originalChildCount = rootChapters[0].children.length;

      // when
      epub.addChapter({
        title: 'New Nested Chapter',
        parentId,
        content: '<p>Nested content</p>',
      });

      // then
      const updatedRootChapters = epub.getRootChapters();
      const updatedParent = updatedRootChapters[0];

      expect(updatedParent.children.length).toBe(originalChildCount + 1);
    });
  });

  describe('Append Content to Chapters', () => {
    it('New content is accessible when appended to a chapter', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      const targetChapter = chapters[0];
      const originalContent = targetChapter.content;

      const appendedText = '<hr/><p>This content was appended.</p>';

      // when
      epub.appendToChapter(targetChapter.id, appendedText);

      // then
      const updatedChapter = epub.getChapter(targetChapter.id);
      expect(updatedChapter?.content).toContain(originalContent);
      expect(updatedChapter?.content).toContain(appendedText);
      expect(updatedChapter?.content.indexOf(appendedText)).toBeGreaterThan(
        updatedChapter?.content.indexOf(originalContent) || 0,
      );
    });

    it('New content is accessible when appended to a chapter', async () => {
      // given

      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const chapters = epub.getAllChapters();

      const chapterId = chapters[0].id;
      const htmlContent = `
          <section>
            <h2>Additional Section</h2>
            <p>This is additional content.</p>
          </section>
        `;

      // when
      epub.appendToChapter(chapterId, htmlContent);
      // then
      const updatedChapter = epub.getChapter(chapterId);

      expect(updatedChapter?.content).toContain('Additional Section');
      expect(updatedChapter?.content).toContain('This is additional content');
    });
  });

  describe('Update Metadata', () => {
    it('The new title is accessible when updated', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.setMetadata({
        title: 'Updated Title',
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.title).toBe('Updated Title');
    });

    it('The new description is accessible when updated', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      const newDescription = 'This is an updated description.';

      // when
      epub.setMetadata({
        description: newDescription,
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.description).toBe(newDescription);
    });

    it('The new publisher is accessible when updated', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.setMetadata({
        publisher: 'New Publisher',
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.publisher).toBe('New Publisher');
    });

    it('All new metadata is accessible when updated', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      // when
      epub.setMetadata({
        description: 'New description',
        publisher: 'Updated Publisher',
        subject: 'Testing',
        rights: 'Copyright 2026',
      });

      // then
      const metadata = epub.getMetadata();
      expect(metadata.description).toBe('New description');
      expect(metadata.publisher).toBe('Updated Publisher');
      expect(metadata.subject).toBe('Testing');
      expect(metadata.rights).toBe('Copyright 2026');
    });

    it('All old metadata is preserved if unchanged', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalMetadata = epub.getMetadata();

      // when
      epub.setMetadata({
        description: 'New description only',
      });

      // then
      const updatedMetadata = epub.getMetadata();
      expect(updatedMetadata.title).toBe(originalMetadata.title);
      expect(updatedMetadata.creator).toBe(originalMetadata.creator);
      expect(updatedMetadata.language).toBe(originalMetadata.language);
      expect(updatedMetadata.description).toBe('New description only');
    });
  });

  describe('Add Images to Existing EPUB', () => {
    it('A new image must be accesible if added', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalImageCount = epub.getAllImages().length;

      const imageData = Buffer.from('new-image-data');

      // when
      epub.addImage({
        filename: 'new-image.jpg',
        data: imageData,
        alt: 'New Image',
      });

      // then
      const updatedImageCount = epub.getAllImages().length;
      expect(updatedImageCount).toBe(originalImageCount + 1);
    });

    it('All new images must be accesible if added', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalImageCount = epub.getAllImages().length;

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
      const updatedImageCount = epub.getAllImages().length;
      expect(updatedImageCount).toBe(originalImageCount + 2);
    });
  });

  describe('Add Stylesheets to Existing EPUB', () => {
    it('A new stylesheet must be accesible if added', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalStylesheetCount = epub.getAllStylesheets().length;

      // when
      epub.addStylesheet({
        filename: 'new-styles.css',
        content: 'body { background: #fff; }',
      });

      // then
      const updatedStylesheetCount = epub.getAllStylesheets().length;
      expect(updatedStylesheetCount).toBe(originalStylesheetCount + 1);
    });
  });

  describe('Export Modified EPUB', () => {
    it('Exporting to file creates a file in the specified route', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.addChapter({
        title: 'Bonus Chapter',
        content: '<p>Bonus content</p>',
      });

      epub.setMetadata({
        description: 'Modified with EPUB3Builder',
      });

      const outputPath = path.join(TEMP_DIR, 'modified.epub');

      // when
      await epub.exportToFile(outputPath);

      // then
      const fileExists = await fs.pathExists(outputPath);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('Validating an EPUB returns true', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      epub.addChapter({
        title: 'New Chapter',
        content: '<p>New content</p>',
      });

      // when
      const validation = epub.validate();

      // then
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('The modified EPUb preserves the original content that was not modified', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);
      const originalTitle = epub.getMetadata().title;
      const originalChapterCount = epub.getAllChapters().length;

      epub.addChapter({
        title: 'Additional Chapter',
        content: '<p>Additional content</p>',
      });

      const outputPath = path.join(TEMP_DIR, 'modified-preserve.epub');
      await epub.exportToFile(outputPath);

      // when
      const modifiedEpub = await EPUBBuilder.parse(outputPath);

      // then
      expect(modifiedEpub.getMetadata().title).toBe(originalTitle);
      expect(modifiedEpub.getAllChapters().length).toBe(
        originalChapterCount + 1,
      );
    });
  });

  describe('Complex Editing Workflow', () => {
    it('should perform multiple editing operations', async () => {
      // given
      const epub = await EPUBBuilder.parse(SIMPLE_GUIDE_PATH);

      const originalMetadata = epub.getMetadata();
      const originalChapterCount = epub.getAllChapters().length;
      const originalImageCount = epub.getAllImages().length;

      epub.setMetadata({
        description:
          `${originalMetadata.description || ''} Modified with EPUB3Builder.`.trim(),
        publisher: 'Test Publisher',
      });

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

      const chapters = epub.getAllChapters();
      epub.appendToChapter(
        chapters[0].id,
        '<hr/><p><em>Note: This book has been modified.</em></p>',
      );

      epub.addImage({
        filename: 'appendix-diagram.png',
        data: Buffer.from('diagram-data'),
        alt: 'Appendix Diagram',
      });

      epub.addStylesheet({
        filename: 'custom.css',
        content: '.note { font-style: italic; }',
      });

      // when
      const validation = epub.validate();

      const outputPath = path.join(TEMP_DIR, 'complex-edit.epub');
      await epub.exportToFile(outputPath);

      const modifiedEpub = await EPUBBuilder.parse(outputPath);

      // then
      expect(validation.isValid).toBe(true);

      expect(modifiedEpub.getAllChapters().length).toBe(
        originalChapterCount + 1,
      );
      expect(modifiedEpub.getAllImages().length).toBe(originalImageCount + 1);
      expect(modifiedEpub.getMetadata().description).toContain(
        'Modified with EPUB3Builder',
      );
    });
  });
});
