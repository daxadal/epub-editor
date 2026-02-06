/* eslint-disable security/detect-non-literal-regexp */

import * as path from 'node:path';

import * as fs from 'fs-extra';

import { Chapter, EPUB2Builder, EPUB3Builder } from '../src';

function copyStyleSheets(
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

function copyImages(
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

function copyAllChapters(
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
    let updatedContent = chapter.content;

    // Update stylesheet references in content
    stylesheetMap.forEach((newFilename, oldFilename) => {
      const oldPath = oldFilename;
      const newPath = `styles/${newFilename}`;

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
    });

    // Update image references in content
    imageMap.forEach((newFilename, oldFilename) => {
      const oldPath = oldFilename;
      const newPath = `images/${newFilename}`;

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
    });

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
/**
 * Merge the series EPUBs into one combined EPUB
 * Run with: npx ts-node examples/merge-example.ts
 */
async function mergeExample({
  seriesName,
  outputFile,
  sourceFiles,
}: {
  seriesName: string;
  outputFile: string;
  sourceFiles: string[];
}) {
  const isEpub2 = process.argv.includes('--epub2');
  const EPUBBuilder = isEpub2 ? EPUB2Builder : EPUB3Builder;
  console.log(`📚 Merging "${seriesName}" series...\n`);

  const basePath = path.join(__dirname, '..');

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
  console.log(`   Title: ${seriesName}`);
  console.log(`   Authors: ${Array.from(authors).join(', ')}`);
  console.log(`   Language: ${language}\n`);

  // Create the merged EPUB
  const mergedEPUB = new EPUBBuilder({
    title: seriesName,
    creator: Array.from(authors).join(', '),
    language,
    publisher: metadataList[0].publisher,
    description: `Complete series containing: ${metadataList.map((m) => m.title).join('; ')}`,
  });

  console.log('🔧 Merging content...');

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

    const stylesheetMap = copyStyleSheets(sourceEPUB, bookNumber, mergedEPUB);
    const imageMap = copyImages(sourceEPUB, bookNumber, mergedEPUB);

    // Get all root chapters from this EPUB
    const rootChapters = sourceEPUB.getRootChapters();

    const chapterCount = copyAllChapters(
      rootChapters,
      stylesheetMap,
      imageMap,
      mergedEPUB,
      sectionId,
    );

    console.log(`      ✓ Added ${chapterCount} chapters`);
  }

  // Export the merged EPUB
  const outputPath = path.join(basePath, outputFile);
  console.log(`\n💾 Exporting merged EPUB to: ${outputPath}`);

  await mergedEPUB.exportToFile(outputPath);

  console.log('✅ Successfully created merged EPUB!');
  console.log('\n📊 Summary:');
  console.log(`   Total chapters: ${mergedEPUB.getAllChapters().length}`);
  console.log(`   Total images: ${mergedEPUB.getAllImages().length}`);
  console.log(`   Total stylesheets: ${mergedEPUB.getAllStylesheets().length}`);

  // Get file size
  const stats = await fs.stat(outputPath);
  console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// Run the merge
mergeExample({
  seriesName: 'Kits Out For Temeria',
  outputFile: 'resources/kits-out-of-temeria.epub',
  sourceFiles: [
    'resources/Kits Out Of Temeria/1 - companions.epub',
    'resources/Kits Out Of Temeria/2 - acquisition.epub',
    'resources/Kits Out Of Temeria/3 - interlude for naming.epub',
    'resources/Kits Out Of Temeria/4 - vision test.epub',
  ],
}).catch((error) => {
  console.error('\n❌ Error merging EPUBs:', error);
  process.exit(1);
});
