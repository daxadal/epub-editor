/**
 * EPUB 2 to EPUB 3 Conversion Example
 *
 * Demonstrates parsing an existing EPUB 2 file and converting it to EPUB 3
 */

import * as path from 'path';

import { EPUB2Builder } from '../src';

async function main() {
  console.log('EPUB 2 to EPUB 3 Conversion Example\n');

  // Path to an existing EPUB 2 file
  const epub2Path = path.join(__dirname, 'kits-out-of-temeria.epub');

  console.log(`Parsing EPUB 2 file: ${epub2Path}`);

  // Parse the EPUB 2 file
  const epub2 = await EPUB2Builder.parse(epub2Path);

  console.log('\nEPUB 2 Metadata:');
  console.log(`  Title: ${epub2.getMetadata().title}`);
  console.log(`  Author: ${epub2.getMetadata().creator}`);
  console.log(`  Language: ${epub2.getMetadata().language}`);
  console.log(`  Identifier: ${epub2.getMetadata().identifier}`);

  // Get chapter information
  const chapters = epub2.getAllChapters();
  console.log(`\nFound ${chapters.length} chapters:`);
  chapters.forEach((chapter, index) => {
    console.log(`  ${index + 1}. ${chapter.title}`);
  });

  // Get resource information
  const images = epub2.getAllImages();
  const stylesheets = epub2.getAllStylesheets();
  console.log(`\nResources:`);
  console.log(`  Images: ${images.length}`);
  console.log(`  Stylesheets: ${stylesheets.length}`);

  // Validate the original EPUB 2
  const validation = epub2.validate();
  console.log(`\nEPUB 2 Validation:`);
  console.log(`  Valid: ${validation.isValid}`);
  if (validation.errors.length > 0) {
    console.log(`  Errors: ${validation.errors.length}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`  Warnings: ${validation.warnings.length}`);
  }

  // Convert to EPUB 3
  console.log('\n--- Converting to EPUB 3 ---\n');
  const epub3 = epub2.toEPUB3();

  console.log('EPUB 3 Metadata:');
  console.log(`  Title: ${epub3.getMetadata().title}`);
  console.log(`  Author: ${epub3.getMetadata().creator}`);
  console.log(`  Language: ${epub3.getMetadata().language}`);
  console.log(`  Identifier: ${epub3.getMetadata().identifier}`);

  // Verify chapters were converted
  const epub3Chapters = epub3.getAllChapters();
  console.log(`\nConverted ${epub3Chapters.length} chapters:`);
  epub3Chapters.forEach((chapter, index) => {
    console.log(`  ${index + 1}. ${chapter.title}`);
  });

  // Verify resources were converted
  const epub3Images = epub3.getAllImages();
  const epub3Stylesheets = epub3.getAllStylesheets();
  console.log(`\nConverted Resources:`);
  console.log(`  Images: ${epub3Images.length}`);
  console.log(`  Stylesheets: ${epub3Stylesheets.length}`);

  // Validate the converted EPUB 3
  const epub3Validation = epub3.validate();
  console.log(`\nEPUB 3 Validation:`);
  console.log(`  Valid: ${epub3Validation.isValid}`);
  if (epub3Validation.errors.length > 0) {
    console.log(`  Errors: ${epub3Validation.errors.length}`);
  }
  if (epub3Validation.warnings.length > 0) {
    console.log(`  Warnings: ${epub3Validation.warnings.length}`);
  }

  // Export the converted EPUB 3
  const outputPath = path.join(__dirname, 'converted-to-epub3.epub');
  await epub3.exportToFile(outputPath);

  console.log(`\n✓ EPUB 3 created successfully: ${outputPath}`);
  console.log('\nConversion complete! The EPUB 3 file now uses:');
  console.log('  - XHTML5 navigation document instead of NCX');
  console.log('  - XHTML5 content documents instead of XHTML 1.1');
  console.log('  - OPF 3.0 package document instead of OPF 2.0');
}

main().catch(console.error);
