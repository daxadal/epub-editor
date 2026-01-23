/* eslint-disable security/detect-non-literal-regexp */

import * as path from 'path';

import * as fs from 'fs-extra';

import { Chapter, EPUBBuilder } from '../src';

function copyStyleSheets(
  sourceEPUB: EPUBBuilder,
  addedStylesheets: Map<string, string>,
  bookNumber: number,
  mergedEPUB: EPUBBuilder,
) {
  // Get all stylesheets from this EPUB (except default)

  const stylesheets = sourceEPUB
    .getAllStylesheets()
    .filter((s) => s.id !== 'default-style');

  // Add stylesheets with unique naming
  const stylesheetMap = new Map<string, string>(); // old filename -> new filename
  for (const stylesheet of stylesheets) {
    const contentHash = Buffer.from(stylesheet.content)
      .toString('base64')
      .substring(0, 20);

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
}

function copyImages(
  sourceEPUB: EPUBBuilder,
  addedImages: Map<string, string>,
  bookNumber: number,
  mergedEPUB: EPUBBuilder,
) {
  const images = sourceEPUB.getAllImages();

  // Add images with unique naming
  const imageMap = new Map<string, string>(); // old filename -> new filename
  for (const image of images) {
    const dataHash = image.data.toString('base64').substring(0, 20);

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

function copyChapter(
  chapter: Chapter,
  imageMap: Map<string, string>,
  mergedEPUB: EPUBBuilder,
  sectionId: string,
) {
  // Update content to reflect new image and stylesheet paths
  let updatedContent = chapter.content;

  // Update image references in content
  imageMap.forEach((newFilename, oldFilename) => {
    const oldPath = oldFilename;
    const newPath = `images/${newFilename}`;

    // Handle various possible path formats
    const patterns = [
      new RegExp(`src=["']\\.\\./${oldPath}["']`, 'g'),
      new RegExp(`src=["']${oldPath}["']`, 'g'),
      new RegExp(`src=["']\\.\\./${path.basename(oldPath)}["']`, 'g'),
      new RegExp(`src=["']${path.basename(oldPath)}["']`, 'g'),
    ];

    patterns.forEach((pattern) => {
      updatedContent = updatedContent.replace(pattern, `src="../${newPath}"`);
    });
  });

  mergedEPUB.addChapter({
    title: chapter.title,
    content: updatedContent,
    parentId: sectionId,
    headingLevel: chapter.headingLevel,
    linear: chapter.linear,
  });
}

/**
 * Merge the 4 "Kits Out For Temeria" series EPUBs into one combined EPUB
 * Run with: npx ts-node examples/merge-kits-out-for-temeria.ts
 */
async function mergeExample() {
  console.log('📚 Merging "Kits Out For Temeria" series...\n');

  // Define the source EPUBs in order
  const sourceFiles = [
    'resources/1 - companions.epub',
    'resources/2 - acquisition - Faetality.epub',
    'resources/3 - interlude for naming - Faetality.epub',
    'resources/4 - vision test - Faetality.epub',
  ];

  const basePath = path.join(__dirname, '..');

  try {
    // Parse all source EPUBs
    console.log('📖 Loading source EPUBs...');
    const sourceEPUBs = await Promise.all(
      sourceFiles.map(async (file) => {
        const fullPath = path.join(basePath, file);
        console.log(`   Loading: ${file}`);
        return await EPUBBuilder.parse(fullPath);
      }),
    );
    console.log('✅ All EPUBs loaded successfully\n');

    // Extract metadata from all EPUBs
    const metadataList = sourceEPUBs.map((epub) => epub.getMetadata());

    // Collect unique authors
    const authors = new Set<string>();
    metadataList.forEach((meta) => {
      if (meta.creator) {
        authors.add(meta.creator);
      }
    });

    // Use the language from the first EPUB
    const language = metadataList[0].language || 'en';

    console.log('📋 Merged Metadata:');
    console.log(`   Title: Kits Out For Temeria`);
    console.log(`   Authors: ${Array.from(authors).join(', ')}`);
    console.log(`   Language: ${language}\n`);

    // Create the merged EPUB
    const mergedEPUB = new EPUBBuilder({
      title: 'Kits Out For Temeria',
      creator: Array.from(authors).join(', '),
      language,
      publisher: metadataList[0].publisher,
      description: `Complete series containing: ${metadataList.map((m) => m.title).join('; ')}`,
    });

    console.log('🔧 Merging content...');

    // Track added resources to avoid duplicates
    const addedStylesheets = new Map<string, string>(); // content hash -> new filename
    const addedImages = new Map<string, string>(); // data hash -> new filename

    // Process each source EPUB
    for (let i = 0; i < sourceEPUBs.length; i++) {
      const sourceEPUB = sourceEPUBs[i];
      const sourceMeta = metadataList[i];
      const bookNumber = i + 1;

      console.log(`\n   📕 Processing Book ${bookNumber}: ${sourceMeta.title}`);

      // Create a section chapter for this book
      const sectionId = mergedEPUB.addChapter({
        title: sourceMeta.title,
        headingLevel: 1,
      });

      console.log(`      ✓ Created section: ${sourceMeta.title}`);

      copyStyleSheets(sourceEPUB, addedStylesheets, bookNumber, mergedEPUB);

      // Get all images from this EPUB
      const imageMap = copyImages(
        sourceEPUB,
        addedImages,
        bookNumber,
        mergedEPUB,
      );

      // Get all root chapters from this EPUB
      const rootChapters = sourceEPUB.getRootChapters();

      // Add all chapters as children of the section
      let chapterCount = 0;
      for (const chapter of rootChapters) {
        copyChapter(chapter, imageMap, mergedEPUB, sectionId);
        chapterCount++;
      }

      console.log(`      ✓ Added ${chapterCount} chapters`);
    }

    // Export the merged EPUB
    const outputPath = path.join(
      basePath,
      'examples',
      'kits-out-of-temeria.epub',
    );
    console.log(`\n💾 Exporting merged EPUB to: ${outputPath}`);

    await mergedEPUB.exportToFile(outputPath);

    console.log('✅ Successfully created merged EPUB!');
    console.log('\n📊 Summary:');
    console.log(`   Total chapters: ${mergedEPUB.getAllChapters().length}`);
    console.log(`   Total images: ${mergedEPUB.getAllImages().length}`);
    console.log(
      `   Total stylesheets: ${mergedEPUB.getAllStylesheets().length}`,
    );

    // Get file size
    const stats = await fs.stat(outputPath);
    console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('\n❌ Error merging EPUBs:', error);
    process.exit(1);
  }
}

// Run the merge
mergeExample();
