// eslint-disable @typescript-eslint/no-unused-vars
import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EPUB2Builder, EPUB3Builder } from '../src';


async function parseEpubs(folderPath: string, EPUBBuilder: typeof EPUB2Builder | typeof EPUB3Builder) {
  console.log('📖 Loading source EPUBs...');
  const folderFiles = await fs.readdir(folderPath);
  const sourceEPUBs = await Promise.all(
    folderFiles.map((file) => EPUBBuilder.parse(path.join(folderPath, file), {
      titleExtraction: ['CONTENT'],
    }))
  );

  // Number EPUB titles
  for (const epub of sourceEPUBs) {
    const index = epub.getCalibreMetadata().seriesIndex;
    if (index)
      epub.setMetadata({ title: index + '. ' + epub.getMetadata().title });
  }

  // Sort by series index
  sourceEPUBs.sort((a, b) => {
    const indexA = a.getCalibreMetadata().seriesIndex;
    const indexB = b.getCalibreMetadata().seriesIndex;
    return indexA && indexB ? indexA - indexB : indexA ? -1 : indexB ? 1 : 0;
  });
  return sourceEPUBs;
}

/**
 * Merge the series EPUBs into one combined EPUB
 * Run with: npx ts-node examples/merge-example.ts
 */
async function mergeExample({

   outputFile,
  sourceFolder,
}: {
  outputFile: string;
  sourceFolder: string;
}) {
  const isEpub2 = process.argv.includes('--epub2');
  const EPUBBuilder = isEpub2 ? EPUB2Builder : EPUB3Builder;
  console.log(`📚 Merging series...\n`);

  const basePath = path.join(__dirname, '..');
  const folderPath = path.join(basePath, sourceFolder);

  // Parse all source EPUBs
  const sourceEPUBs = await parseEpubs(folderPath, EPUBBuilder);


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
  const language = sourceEPUBs[0].getMetadata().language || 'en';
  const seriesName = sourceEPUBs[0].getCalibreMetadata().seriesName ?? 'Series'

  console.log('📋 Merged Metadata:');
  console.log(`   Title: ${seriesName}`);
  console.log(`   Authors: ${Array.from(authors).join(', ')}`);
  console.log(`   Language: ${language}\n`);

  // Create the merged EPUB
  const mergedEPUB = new EPUBBuilder({
    title: seriesName,
    creator: Array.from(authors).join(', '),
    language,
    publisher: sourceEPUBs[0].getMetadata().publisher,
    description: `Complete series containing: ${sourceEPUBs.map((m) => m.getMetadata().title).join('; ')}`,
  });

  console.log('🔧 Merging content...');

  // Process each source EPUB
  for (let i = 0; i < sourceEPUBs.length; i++) {
    const sourceEPUB = sourceEPUBs[i];
    const title = sourceEPUB.getMetadata().title;
    const bookNumber = i + 1;

    console.log(`\n   📕 Processing Book ${bookNumber}: ${title}`);
    console.log(`      ✓ Created section: ${title}`);

    mergedEPUB.addEpubAsChapter({ title, headingLevel: 1 }, sourceEPUB);

    console.log(`      ✓ Added ${sourceEPUB.getAllChapters().length} chapters`);
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
  outputFile: 'examples/writing-prompts.epub',
  sourceFolder: 'resources/writing-prompts/downloads',
}).catch((error) => {
  console.error('\n❌ Error merging EPUBs:', error);
  process.exit(1);
});

