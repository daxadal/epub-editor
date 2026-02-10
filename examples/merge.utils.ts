/* eslint-disable security/detect-non-literal-regexp */

import * as path from 'node:path';

import { EPUB2Builder, EPUB3Builder, Chapter } from '../src';

export function copyStyleSheets(
  sourceEPUB: EPUB2Builder | EPUB3Builder,
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
    // This stylesheet hasn't been added yet
    const uniqueFilename = `book${bookNumber}-${path.basename(stylesheet.filename)}`;
    mergedEPUB.addStylesheet({
      filename: uniqueFilename,
      content: stylesheet.content,
    });
    stylesheetMap.set(stylesheet.filename, uniqueFilename);
    console.log(`      ✓ Added stylesheet: ${uniqueFilename}`);
  }
  return stylesheetMap;
}

export function copyImages(
  sourceEPUB: EPUB2Builder | EPUB3Builder,
  bookNumber: number,
  mergedEPUB: EPUB2Builder | EPUB3Builder,
): Map<string, string> {
  const images = sourceEPUB.getAllImages();

  // Add images with unique naming
  const imageMap = new Map<string, string>(); // old filename -> new filename
  for (const image of images) {
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
    imageMap.set(image.filename, uniqueFilename);
    console.log(`      ✓ Added image: ${uniqueFilename}`);
  }
  return imageMap;
}

function updateSinglePath(
  updatedContent: string,
  oldPath: string,
  newPath: string,
) {
  // Handle various possible path formats
  const patterns = [
    new RegExp(String.raw`src=["']\.\./${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']\.\./${path.basename(oldPath)}["']`, 'g'),
    new RegExp(String.raw`src=["']${path.basename(oldPath)}["']`, 'g'),
  ];

  patterns.forEach((pattern) => {
    updatedContent = updatedContent.replace(pattern, `src="../${newPath}"`);
  });
  return updatedContent;
}

function replacePathsWithMaps(
  updatedContent: string,
  stylesheetMap: Map<string, string>,
  imageMap: Map<string, string>,
) {
  stylesheetMap.forEach((newFilename, oldFilename) => {
    updatedContent = updateSinglePath(
      updatedContent,
      oldFilename,
      `styles/${newFilename}`,
    );
  });

  // Update image references in content
  imageMap.forEach((newFilename, oldFilename) => {
    updatedContent = updateSinglePath(
      updatedContent,
      oldFilename,
      `images/${newFilename}`,
    );
  });
  return updatedContent;
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
    // Update content to reflect new image and stylesheet paths
    const updatedContent = replacePathsWithMaps(
      chapter.content,
      stylesheetMap,
      imageMap,
    );

    mergedEPUB.addChapter({
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
        sectionId,
      );
      chapterCount += childrenCount;
    }
  }
  return chapterCount;
}
