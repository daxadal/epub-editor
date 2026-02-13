/**
 * Example demonstrating parsing and editing an existing EPUB
 * Run with: npx ts-node examples/edit-example.ts <path-to-epub> [--epub2]
 */

import * as path from 'node:path';

import { EPUB2Builder, EPUB3Builder } from '../src';

async function editExistingEPUB() {
  const args = process.argv.slice(2);

  const isEpub2 = process.argv.includes('--epub2');
  const EPUBBuilder = isEpub2 ? EPUB2Builder : EPUB3Builder;

  if (args.length === 0) {
    console.error(
      'Usage: npx ts-node examples/edit-example.ts <path-to-epub> [--epub2]',
    );
    console.error('');
    console.error(
      'This example loads an existing EPUB, adds a new chapter, and saves it.',
    );
    process.exit(1);
  }

  const inputPath = args[0];

  try {
    console.log(`📖 Loading EPUB from: ${inputPath}`);
    const epub = await EPUBBuilder.parse(inputPath);

    // Display current metadata
    const metadata = epub.getMetadata();
    console.log('');
    console.log('📋 Current Metadata:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Author: ${metadata.creator}`);
    console.log(`   Language: ${metadata.language}`);
    console.log(`   Publisher: ${metadata.publisher || 'N/A'}`);

    // Display chapters
    const chapters = epub.getRootChapters();
    console.log('');
    console.log(`📚 Found ${chapters.length} root chapters:`);
    chapters.forEach((chapter, idx) => {
      console.log(`   ${idx + 1}. ${chapter.title}`);
      if (chapter.children.length > 0) {
        chapter.children.forEach((child, childIdx) => {
          console.log(`      ${idx + 1}.${childIdx + 1}. ${child.title}`);
        });
      }
    });

    // Add a new chapter
    console.log('');
    console.log('✍️  Adding new bonus chapter...');
    const bonusChapter = epub.addChapter({
      title: 'Bonus Chapter: Additional Content',
      content: `
        <p>This is a bonus chapter added by the EPUBBuilder ${isEpub2 ? 'V2' : 'V3'} library!</p>
        <p>This demonstrates how you can load an existing EPUB and add new content.</p>
        <h2>What You Can Do</h2>
        <ul>
          <li>Add new chapters</li>
          <li>Modify existing chapters</li>
          <li>Update metadata</li>
          <li>Add images</li>
          <li>Add custom styles</li>
        </ul>
        <p>The navigation document will be automatically updated to include this chapter.</p>
      `,
    });

    console.log(`   Chapter ID: ${bonusChapter}`);

    // Optionally append to an existing chapter
    if (chapters.length > 0) {
      console.log('');
      console.log('➕ Appending content to first chapter...');
      epub.appendToChapter(
        chapters[0].id,
        `
        <hr/>
        <p><em>Note: This content was appended using EPUBBuilder.</em></p>
      `,
      );
    }

    // Update metadata
    console.log('');
    console.log('🔄 Updating metadata...');
    epub.setMetadata({
      title: `${metadata.title} (Modified with ${isEpub2 ? 'V2' : 'V3'})`,
      description:
        `${metadata.description || ''} Modified with EPUBBuilder.`.trim(),
    });

    // Validate
    console.log('');
    console.log('🔍 Validating modified EPUB...');
    const validation = epub.validate();

    if (!validation.isValid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach((err) => console.error(`  - ${err}`));
      return;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Warnings:');
      validation.warnings.forEach((warn) => console.warn(`  - ${warn}`));
    }

    // Export to new file
    const outputPath = path.join(
      path.dirname(inputPath),
      `${path.basename(inputPath, '.epub')}-modified-${isEpub2 ? '2' : '3'}.epub`,
    );

    console.log('');
    console.log('📦 Exporting modified EPUB...');
    await epub.exportToFile(outputPath);

    const buffer = await epub.export();
    const sizeKB = (buffer.length / 1024).toFixed(2);

    console.log('');
    console.log('✅ Modified EPUB created successfully!');
    console.log(`   Original: ${inputPath}`);
    console.log(`   Modified: ${outputPath}`);
    console.log(`   Size: ${sizeKB} KB`);
    console.log(`   Total chapters: ${chapters.length + 1}`);
  } catch (error) {
    console.error('');
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// Run the example
editExistingEPUB();
