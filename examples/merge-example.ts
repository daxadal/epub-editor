import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder, EPUB3Builder } from '../src';

import { addEpubAsChapter } from './merge.utils';

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
      return await EPUBBuilder.parse(fullPath, { ignoreHeadTitle: true });
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

  // Track added resources to avoid duplicates
  const addedStylesheets = new Map<string, string>(); // content hash -> new filename
  const addedImages = new Map<string, string>(); // data hash -> new filename

  // Process each source EPUB
  for (let i = 0; i < sourceEPUBs.length; i++) {
    const sourceEPUB = sourceEPUBs[i];
    const title = sourceEPUB.getMetadata().title;
    const bookNumber = i + 1;

    console.log(`\n   📕 Processing Book ${bookNumber}: ${title}`);
    console.log(`      ✓ Created section: ${title}`);

    const chapterCount = addEpubAsChapter(
      { title, headingLevel: 1 },
      mergedEPUB,
      sourceEPUB,
      addedStylesheets,
      addedImages,
      bookNumber,
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
  seriesName: 'Re Merged Series',
  outputFile: 'resources/re-merged.epub',
  sourceFiles: [
    'examples/simple-guide-3.epub',
    'resources/Diaries_from_an.epub',
  ],
}).catch((error) => {
  console.error('\n❌ Error merging EPUBs:', error);
  process.exit(1);
});
