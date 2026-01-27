/**
 * EPUB 2 Creation Example
 *
 * Demonstrates creating a blank EPUB 2 document with chapters, images, and stylesheets
 */

import * as path from 'path';

import { EPUB2Builder } from '../src';

async function main() {
  console.log('Creating EPUB 2 document...\n');

  // Create a new EPUB 2 builder
  const epub = new EPUB2Builder({
    title: 'My EPUB 2 Book',
    creator: 'John Doe',
    language: 'en',
    publisher: 'Sample Press',
    description: 'A sample EPUB 2 book created with epub-builder',
    subject: 'Fiction',
    rights: 'Copyright © 2024 John Doe. All rights reserved.',
  });

  // Add a custom stylesheet
  epub.addStylesheet({
    filename: 'custom-styles',
    content: `
      body {
        font-family: Georgia, serif;
        line-height: 1.6;
        margin: 2em;
      }
      h1 {
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 0.5em;
      }
      h2 {
        color: #34495e;
        margin-top: 1.5em;
      }
      p {
        text-align: justify;
        margin-bottom: 1em;
      }
      .chapter-header {
        text-align: center;
        margin: 2em 0;
      }
    `,
  });

  // Add chapters with nested structure
  const chapter1 = await epub.addChapter({
    title: 'Introduction',
    content: `
      <div class="chapter-header">
        <h1>Introduction</h1>
      </div>
      <p>Welcome to this sample EPUB 2 book. This chapter introduces the main themes and characters.</p>
      <p>EPUB 2 uses the NCX (Navigation Control File for XML) format for the table of contents, which is different from EPUB 3's XHTML navigation document.</p>
    `,
  });

  // Add nested sub-chapters
  await epub.addChapter({
    title: 'Background',
    content: `
      <h2>Background</h2>
      <p>This section provides important background information about the story.</p>
      <p>In EPUB 2, content documents use XHTML 1.1 with the proper DOCTYPE declaration.</p>
    `,
    parentId: chapter1,
  });

  await epub.addChapter({
    title: 'Characters',
    content: `
      <h2>Main Characters</h2>
      <p>Here are the main characters of our story:</p>
      <ul>
        <li><strong>Alice</strong> - The protagonist</li>
        <li><strong>Bob</strong> - Alice's companion</li>
        <li><strong>Carol</strong> - The antagonist</li>
      </ul>
    `,
    parentId: chapter1,
  });

  // Add more top-level chapters
  await epub.addChapter({
    title: 'Chapter 1: The Beginning',
    content: `
      <div class="chapter-header">
        <h1>Chapter 1: The Beginning</h1>
      </div>
      <p>It was a dark and stormy night when Alice first discovered the ancient manuscript.</p>
      <p>The manuscript contained secrets that would change everything she knew about the world.</p>
    `,
  });

  await epub.addChapter({
    title: 'Chapter 2: The Journey',
    content: `
      <div class="chapter-header">
        <h1>Chapter 2: The Journey</h1>
      </div>
      <p>Alice and Bob set out on their journey to uncover the truth.</p>
      <p>They traveled through forests, crossed rivers, and climbed mountains.</p>
    `,
  });

  // Add an image (if you have one)
  // epub.addImage({
  //   id: 'cover-image',
  //   data: fs.readFileSync('./path/to/cover.jpg'),
  //   mediaType: 'image/jpeg',
  //   href: 'images/cover.jpg',
  // });

  // Validate the EPUB
  const validation = epub.validate();
  console.log('Validation result:');
  console.log(`Valid: ${validation.isValid}`);
  if (validation.errors.length > 0) {
    console.log('Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.log('Warnings:', validation.warnings);
  }
  console.log('');

  // Export to file
  const outputPath = path.join(__dirname, 'output-epub2.epub');
  await epub.exportToFile(outputPath);

  console.log(`✓ EPUB 2 created successfully: ${outputPath}`);
  console.log(
    '\nYou can now open this file with any EPUB reader that supports EPUB 2.0.1',
  );
}

main().catch(console.error);
