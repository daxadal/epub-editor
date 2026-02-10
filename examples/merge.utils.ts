/* eslint-disable security/detect-non-literal-regexp */

import * as path from 'node:path';
import { createHash } from 'node:crypto';

import { EPUB2Builder, EPUB3Builder, Chapter, AddChapterOptions } from '../src';

const hash = (content: string | Buffer) =>
  createHash('sha1').update(content).digest('base64');

export function copyStyleSheets(
  sourceEPUB: EPUB2Builder | EPUB3Builder,
  addedStylesheets: Map<string, string>,
  bookNumber: number,
  mergedEPUB: EPUB2Builder | EPUB3Builder,
): Map<string, string> {
  // Get all stylesheets from this EPUB (except default)
  const stylesheets = sourceEPUB
    .getAllStylesheets()
    .filter((s) => s.id !== 'default-style');

  // Add stylesheets with unique naming
  const stylesheetMap = new Map<string, string>(); // old filename -> new filename
  for (const stylesheet of stylesheets) {
    const contentHash = hash(stylesheet.content);

    if (!addedStylesheets.has(contentHash)) {
      // This stylesheet hasn't been added yet
      const uniqueFilename = `book${bookNumber}-${path.basename(stylesheet.filename)}`;
      mergedEPUB.addStylesheet({
        filename: uniqueFilename,
        content: stylesheet.content,
      });
      addedStylesheets.set(contentHash, uniqueFilename);
      stylesheetMap.set(stylesheet.filename, uniqueFilename);
      console.log(`      ✓ Added stylesheet: ${uniqueFilename}`);
    } else {
      stylesheetMap.set(
        stylesheet.filename,
        addedStylesheets.get(contentHash)!,
      );
    }
  }
  return stylesheetMap;
}

export function copyImages(
  sourceEPUB: EPUB2Builder | EPUB3Builder,
  addedImages: Map<string, string>,
  bookNumber: number,
  mergedEPUB: EPUB2Builder | EPUB3Builder,
): Map<string, string> {
  const images = sourceEPUB.getAllImages();

  // Add images with unique naming
  const imageMap = new Map<string, string>(); // old filename -> new filename
  for (const image of images) {
    const dataHash = hash(image.data);

    if (!addedImages.has(dataHash)) {
      // This image hasn't been added yet
      const originalFilename = path.basename(image.filename);
      const ext = path.extname(originalFilename);
      const baseName = path.basename(originalFilename, ext);
      const uniqueFilename = `book${bookNumber}-${baseName}${ext}`;

      mergedEPUB.addImage({
        filename: uniqueFilename,
        data: image.data,
        alt: image.alt,
        isCover: false, // Don't preserve cover flags in merged book
      });
      addedImages.set(dataHash, uniqueFilename);
      imageMap.set(image.filename, uniqueFilename);
      console.log(`      ✓ Added image: ${uniqueFilename}`);
    } else {
      imageMap.set(image.filename, addedImages.get(dataHash)!);
    }
  }
  return imageMap;
}

type Replacement = {
  pattern: RegExp;
  replacement: string;
};

function getSingleReplacement(oldPath: string, newPath: string): Replacement[] {
  // Handle various possible path formats
  const patterns = [
    new RegExp(String.raw`src=["']\.\./${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']\.\./${path.basename(oldPath)}["']`, 'g'),
    new RegExp(String.raw`src=["']${path.basename(oldPath)}["']`, 'g'),
  ];

  const replacement = `src="../${newPath}"`;

  return patterns.map((pattern) => ({ pattern, replacement }));
}

function getAllReplacements(
  stylesheetMap: Map<string, string>,
  imageMap: Map<string, string>,
): Replacement[] {
  const allReplacements: Replacement[] = [];
  stylesheetMap.forEach((newFilename, oldFilename) => {
    const replacements = getSingleReplacement(
      oldFilename,
      `styles/${newFilename}`,
    );
    allReplacements.push(...replacements);
  });

  // Update image references in content
  imageMap.forEach((newFilename, oldFilename) => {
    const replacements = getSingleReplacement(
      oldFilename,
      `images/${newFilename}`,
    );
    allReplacements.push(...replacements);
  });

  return allReplacements;
}

export function copyAllChapters(
  rootChapters: Chapter[],
  stylesheetMap: Map<string, string>,
  imageMap: Map<string, string>,
  mergedEPUB: EPUB2Builder | EPUB3Builder,
  sectionId: string,
) {
  // Add all chapters as children of the section
  let chapterCount = 0;
  for (const chapter of rootChapters) {
    const allReplacements = getAllReplacements(stylesheetMap, imageMap);

    // Update content to reflect new image and stylesheet paths
    let updatedContent = chapter.content;
    for (const { pattern, replacement } of allReplacements) {
      updatedContent = updatedContent.replace(pattern, replacement);
    }

    const mergedChapterId = mergedEPUB.addChapter({
      title: chapter.title,
      content: updatedContent,
      parentId: sectionId,
      headingLevel: chapter.headingLevel,
      linear: chapter.linear,
    });

    chapterCount++;

    if (chapter.children && chapter.children.length > 0) {
      const childrenCount = copyAllChapters(
        chapter.children,
        stylesheetMap,
        imageMap,
        mergedEPUB,
        mergedChapterId,
      );
      chapterCount += childrenCount;
    }
  }
  return chapterCount;
}

export function addEpubAsChapter(
  chapter: Omit<AddChapterOptions, 'content'>,
  mergedEPUB: EPUB2Builder | EPUB3Builder,
  sourceEPUB: EPUB2Builder | EPUB3Builder,
  addedStylesheets: Map<string, string>,
  addedImages: Map<string, string>,
  bookNumber: number,
) {
  // Create a section chapter for this book
  const sectionId = mergedEPUB.addChapter(chapter);

  const stylesheetMap = copyStyleSheets(
    sourceEPUB,
    addedStylesheets,
    bookNumber,
    mergedEPUB,
  );

  // Get all images from this EPUB
  const imageMap = copyImages(sourceEPUB, addedImages, bookNumber, mergedEPUB);

  // Get all root chapters from this EPUB
  const rootChapters = sourceEPUB.getRootChapters();

  const chapterCount = copyAllChapters(
    rootChapters,
    stylesheetMap,
    imageMap,
    mergedEPUB,
    sectionId,
  );
  return chapterCount;
}
