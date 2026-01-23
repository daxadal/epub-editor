/**
 * Simple example demonstrating EPUBBuilder usage
 * Run with: npx ts-node examples/simple-example.ts
 */

import * as path from 'path';

import { EPUBBuilder } from '../src';

async function createSimpleBook() {
  console.log('📚 Creating EPUB...');

  // Create a new EPUB
  const epub = new EPUBBuilder({
    title: 'A Simple Guide',
    creator: 'Example Author',
    language: 'en',
    publisher: 'Example Press',
    description: 'A simple example book created with EPUBBuilder',
  });

  // Add chapters
  console.log('✍️  Adding chapters...');

  epub.addChapter({
    title: 'Introduction',
    content: `
      <p>Welcome to this simple guide!</p>
      <p>This book demonstrates the EPUBBuilder library.</p>
    `,
  });

  const part1 = epub.addChapter({
    title: 'Part I: Basics',
    content: "<p>Let's start with the fundamentals.</p>",
  });

  epub.addChapter({
    title: 'Chapter 1: Getting Started',
    parentId: part1,
    content: `
      <p>This is the first chapter.</p>
      <p>It contains some introductory information.</p>
      <h2>A Subsection</h2>
      <p>Here's some more detailed content.</p>
    `,
  });

  epub.addChapter({
    title: 'Chapter 2: Advanced Topics',
    parentId: part1,
    content: `
      <p>Now let's explore more advanced concepts.</p>
      <ul>
        <li>First concept</li>
        <li>Second concept</li>
        <li>Third concept</li>
      </ul>
    `,
  });

  const part2 = epub.addChapter({
    title: 'Part II: Practical Examples',
    content: '<p>Here are some practical examples.</p>',
  });

  epub.addChapter({
    title: 'Chapter 3: Real-World Applications',
    parentId: part2,
    content: `
      <p>Let's see how this works in practice.</p>
      <blockquote>
        "Examples are always better than theory." - Anonymous
      </blockquote>
    `,
  });

  epub.addChapter({
    title: 'Conclusion',
    content: `
      <p>Thank you for reading this guide!</p>
      <p>We hope you found it useful.</p>
    `,
  });

  // Validate
  console.log('🔍 Validating...');
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

  // Export
  const outputPath = path.join(__dirname, 'simple-guide.epub');
  console.log('📦 Exporting...');

  await epub.exportToFile(outputPath);

  const buffer = await epub.export();
  const sizeKB = (buffer.length / 1024).toFixed(2);

  console.log('✅ EPUB created successfully!');
  console.log(`   Location: ${outputPath}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Chapters: ${epub.getRootChapters().length} root chapters`);

  const metadata = epub.getMetadata();
  console.log(`   Title: ${metadata.title}`);
  console.log(`   Author: ${metadata.creator}`);
}

// Run the example
createSimpleBook().catch((error) => {
  console.error('❌ Error creating EPUB:', error.message);
  process.exit(1);
});
