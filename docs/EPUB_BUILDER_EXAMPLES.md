# EPUB Builder Examples

Comprehensive examples for using the EPUB2Builder and EPUB3Builder classes to create and manipulate EPUB files.

## Table of Contents

- [Choosing Between EPUB 2 and EPUB 3](#choosing-between-epub-2-and-epub-3)
- [Basic EPUB Creation](#basic-epub-creation)
- [Adding Content](#adding-content)
- [Nested Chapter Structures](#nested-chapter-structures)
- [Adding Images](#adding-images)
- [Custom Styling](#custom-styling)
- [Metadata Management](#metadata-management)
- [Parsing and Editing EPUBs](#parsing-and-editing-epubs)
- [Merging Multiple EPUBs](#merging-multiple-epubs)
- [Converting EPUB 2 to EPUB 3](#converting-epub-2-to-epub-3)
- [Advanced Examples](#advanced-examples)
- [Error Handling](#error-handling)

## Choosing Between EPUB 2 and EPUB 3

### When to Use EPUB 3.3 (Recommended)

```typescript
import { EPUB3Builder } from 'epub-editor';

const epub = new EPUB3Builder({
  title: 'Modern Book',
  creator: 'Author Name',
  language: 'en',
});
```

**Use EPUB 3 when:**
- Targeting modern ereaders (Kindle, Kobo, Apple Books, etc.)
- Need advanced features (semantic markup, enhanced accessibility)
- Want XHTML5 navigation and content documents
- Creating new books

### When to Use EPUB 2.0.1

```typescript
import { EPUB2Builder } from 'epub-editor';

const epub = new EPUB2Builder({
  title: 'Legacy Compatible Book',
  creator: 'Author Name',
  language: 'en',
});
```

**Use EPUB 2 when:**
- Need compatibility with older ereaders
- Working with existing EPUB 2 files
- Maximum device compatibility is required

**Note:** Both builders share the same API - code written for one works with the other!

## Basic EPUB Creation

### Minimal EPUB 3

```typescript
import { EPUB3Builder } from 'epub-editor';

const epub = new EPUB3Builder({
  title: 'My First Book',
  creator: 'Jane Doe',
  language: 'en',
});

epub.addChapter({
  title: 'Introduction',
  content: '<p>Welcome to my book!</p>',
});

await epub.exportToFile('my-first-book.epub');
```

### Complete EPUB with Full Metadata

```typescript
import { EPUB3Builder } from 'epub-editor';

const epub = new EPUB3Builder({
  title: 'The Complete Guide',
  creator: 'John Smith',
  language: 'en',
  publisher: 'Self Published',
  description: 'A comprehensive guide to everything',
  subject: 'Education, Reference',
  rights: '© 2026 John Smith. All rights reserved.',
  date: '2026-02-18',
  identifier: 'urn:uuid:12345678-1234-1234-1234-123456789012',
});

await epub.exportToFile('complete-guide.epub');
```

## Adding Content

### Adding Multiple Chapters

```typescript
const epub = new EPUB3Builder({ title: 'Multi-Chapter Book' });

// Method 1: Add chapters sequentially
epub.addChapter({
  title: 'Chapter 1: Getting Started',
  content: '<p>This is the first chapter.</p>',
});

epub.addChapter({
  title: 'Chapter 2: Advanced Topics',
  content: '<p>This is the second chapter.</p>',
});

epub.addChapter({
  title: 'Chapter 3: Conclusion',
  content: '<p>This is the final chapter.</p>',
});
```

### Adding Content Later

```typescript
// Create chapter without content
const chapterId = epub.addChapter({
  title: 'Chapter 1',
});

// Add content later
epub.setChapterContent(chapterId, '<p>This is the content.</p>');

// Or append to existing content
epub.appendToChapter(chapterId, '<p>Additional paragraph.</p>');
```

### Rich HTML Content

```typescript
epub.addChapter({
  title: 'Formatted Chapter',
  content: `
    <h2>Section Title</h2>
    <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
    
    <h3>Subsection</h3>
    <ul>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </ul>
    
    <blockquote>
      <p>This is a quote.</p>
    </blockquote>
    
    <p>Visit <a href="https://example.com">this website</a> for more info.</p>
  `,
});
```

## Nested Chapter Structures

### Basic Hierarchy

```typescript
const epub = new EPUB3Builder({ title: 'Structured Book' });

// Top-level part
const part1 = epub.addChapter({
  title: 'Part I: Fundamentals',
  content: '<p>Introduction to Part I</p>',
});

// Chapters under Part I
const chapter1 = epub.addChapter({
  title: 'Chapter 1: Basics',
  parentId: part1,
  content: '<p>Basic concepts</p>',
});

const chapter2 = epub.addChapter({
  title: 'Chapter 2: Intermediate',
  parentId: part1,
  content: '<p>Intermediate concepts</p>',
});

// Sections under Chapter 1
epub.addChapter({
  title: 'Section 1.1: Core Concepts',
  parentId: chapter1,
  content: '<p>Core concept details</p>',
});

epub.addChapter({
  title: 'Section 1.2: Practical Examples',
  parentId: chapter1,
  content: '<p>Example content</p>',
});
```

### Complex Multi-Level Structure

```typescript
const epub = new EPUB3Builder({ title: 'Complex Book' });

// Front matter
const frontMatter = epub.addChapter({ title: 'Front Matter' });
epub.addChapter({ title: 'Dedication', parentId: frontMatter });
epub.addChapter({ title: 'Preface', parentId: frontMatter });

// Part 1
const part1 = epub.addChapter({ title: 'Part I: Foundation' });
const ch1 = epub.addChapter({ title: 'Chapter 1', parentId: part1 });
epub.addChapter({ title: 'Section 1.1', parentId: ch1 });
epub.addChapter({ title: 'Section 1.2', parentId: ch1 });

const ch2 = epub.addChapter({ title: 'Chapter 2', parentId: part1 });
epub.addChapter({ title: 'Section 2.1', parentId: ch2 });

// Part 2
const part2 = epub.addChapter({ title: 'Part II: Advanced' });
const ch3 = epub.addChapter({ title: 'Chapter 3', parentId: part2 });
epub.addChapter({ title: 'Section 3.1', parentId: ch3 });

// Back matter
const backMatter = epub.addChapter({ title: 'Back Matter' });
epub.addChapter({ title: 'Appendix', parentId: backMatter });
epub.addChapter({ title: 'Index', parentId: backMatter });
```

**Result:** Creates a hierarchical table of contents automatically.

## Adding Images

### Adding a Cover Image

```typescript
import * as fs from 'fs-extra';

const epub = new EPUB3Builder({ title: 'Photo Book' });

const coverData = await fs.readFile('cover.jpg');
epub.addImage({
  filename: 'cover.jpg',
  data: coverData,
  isCover: true,
  alt: 'Book Cover',
});
```

### Adding Multiple Images

```typescript
import * as fs from 'fs-extra';

// Add various image types
const jpegData = await fs.readFile('photo.jpg');
epub.addImage({
  filename: 'photo.jpg',
  data: jpegData,
  alt: 'A photograph',
});

const pngData = await fs.readFile('diagram.png');
epub.addImage({
  filename: 'diagram.png',
  data: pngData,
  alt: 'System diagram',
});

const svgData = await fs.readFile('icon.svg');
epub.addImage({
  filename: 'icon.svg',
  data: svgData,
  alt: 'Icon',
});
```

### Referencing Images in Content

```typescript
// First, add the image
const imageData = await fs.readFile('illustration.png');
epub.addImage({
  filename: 'illustration.png',
  data: imageData,
  alt: 'Illustration',
});

// Then reference it in a chapter
epub.addChapter({
  title: 'Illustrated Chapter',
  content: `
    <p>Here is the illustration:</p>
    <img src="../images/illustration.png" alt="Illustration" />
    <p>Caption: A detailed illustration.</p>
  `,
});
```

### Working with Base64 Images

```typescript
// Base64 encoded image data
const base64Image = 'iVBORw0KGgoAAAANSUhEUg...'; // shortened

epub.addImage({
  filename: 'base64-image.png',
  data: base64Image,
  alt: 'Base64 encoded image',
});
```

## Custom Styling

### Adding a Custom Stylesheet

```typescript
const epub = new EPUB3Builder({ title: 'Styled Book' });

epub.addStylesheet({
  filename: 'custom.css',
  content: `
    body {
      font-family: Georgia, serif;
      line-height: 1.6;
      margin: 2em;
    }
    
    h1 {
      color: #2c3e50;
      font-size: 2em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 0.3em;
    }
    
    h2 {
      color: #34495e;
      font-size: 1.5em;
    }
    
    p {
      text-align: justify;
      margin-bottom: 1em;
    }
    
    blockquote {
      border-left: 4px solid #95a5a6;
      padding-left: 1em;
      margin-left: 0;
      font-style: italic;
      color: #7f8c8d;
    }
    
    .chapter-number {
      font-weight: bold;
      color: #e74c3c;
    }
  `,
});

// Use the styles in content
epub.addChapter({
  title: 'Styled Chapter',
  content: `
    <p><span class="chapter-number">Chapter One</span></p>
    <p>This content uses the custom styles defined above.</p>
    <blockquote>
      <p>This quote will be styled with the custom blockquote styles.</p>
    </blockquote>
  `,
});
```

**Note:** Default styles are automatically included with every EPUB. Your custom styles will override them.

## Metadata Management

### Setting Metadata During Creation

```typescript
const epub = new EPUB3Builder({
  title: 'Complete Metadata Example',
  creator: 'Jane Smith',
  language: 'en',
  publisher: 'Independent Publishing',
  description: 'A detailed book with comprehensive metadata',
  subject: 'Fiction, Mystery, Thriller',
  rights: '© 2026 Jane Smith',
  date: '2026-02-18',
  identifier: 'urn:isbn:9781234567890',
});
```

### Getting Metadata

```typescript
const metadata = epub.getMetadata();

console.log(`Title: ${metadata.title}`);
console.log(`Author: ${metadata.creator}`);
console.log(`Language: ${metadata.language}`);
console.log(`Publisher: ${metadata.publisher}`);
console.log(`Description: ${metadata.description}`);
console.log(`Subject: ${metadata.subject}`);
console.log(`Rights: ${metadata.rights}`);
console.log(`Date: ${metadata.date}`);
console.log(`Identifier: ${metadata.identifier}`);
```

### Updating Metadata

```typescript
epub.updateMetadata({
  title: 'Updated Title',
  creator: 'Updated Author',
  description: 'Updated description',
});
```

## Parsing and Editing EPUBs

### Parse an Existing EPUB

```typescript
import { EPUB3Builder, EPUB2Builder } from 'epub-editor';

// Parse EPUB 3
const epub3 = await EPUB3Builder.parse('existing-book-3.epub');

// Parse EPUB 2
const epub2 = await EPUB2Builder.parse('existing-book-2.epub');

// Get information
const metadata = epub3.getMetadata();
const chapters = epub3.getAllChapters();
const images = epub3.getAllImages();
const stylesheets = epub3.getAllStylesheets();

console.log(`Loaded: ${metadata.title} by ${metadata.creator}`);
console.log(`${chapters.length} chapters, ${images.length} images`);
```

### Edit and Re-export

```typescript
// Parse existing EPUB
const epub = await EPUB3Builder.parse('original.epub');

// Add new content
epub.addChapter({
  title: 'Bonus Chapter',
  content: '<p>This is new content added to the book.</p>',
});

// Update metadata
epub.updateMetadata({
  title: 'Updated Edition',
  date: '2026-02-18',
});

// Export modified version
await epub.exportToFile('updated-edition.epub');
```

### Parse Options with Title Extraction

```typescript
// Parse with title extraction from chapter content
const epub = await EPUB3Builder.parse('book.epub', {
  titleExtraction: ['CONTENT'], // Extract titles from chapter HTML
});

// Without this option, titles would be extracted from navigation
```

## Merging Multiple EPUBs

### Basic Merging: Two Books

```typescript
import { EPUB3Builder } from 'epub-editor';

// Parse source EPUBs
const book1 = await EPUB3Builder.parse('book1.epub');
const book2 = await EPUB3Builder.parse('book2.epub');

// Create merged EPUB
const merged = new EPUB3Builder({
  title: 'Complete Series',
  creator: 'Author Name',
  language: 'en',
  description: 'Books 1 and 2 combined',
});

// Add each book as a section
merged.addEpubAsChapter({ title: 'Book 1: The Beginning' }, book1);
merged.addEpubAsChapter({ title: 'Book 2: The End' }, book2);

// Export
await merged.exportToFile('complete-series.epub');
```

### Merging a Trilogy

```typescript
import { EPUB3Builder } from 'epub-editor';

// Parse all books
const books = await Promise.all([
  EPUB3Builder.parse('book1.epub'),
  EPUB3Builder.parse('book2.epub'),
  EPUB3Builder.parse('book3.epub'),
]);

// Get metadata from all books
const metadataList = books.map(book => book.getMetadata());

// Collect unique authors
const authors = new Set();
metadataList.forEach(meta => {
  if (meta.creator) authors.add(meta.creator);
});

// Create merged EPUB
const trilogy = new EPUB3Builder({
  title: 'Complete Trilogy',
  creator: Array.from(authors).join(', '),
  language: metadataList[0].language || 'en',
  description: `Complete trilogy: ${metadataList.map(m => m.title).join('; ')}`,
});

// Add each book
books.forEach((book, index) => {
  const title = book.getMetadata().title;
  trilogy.addEpubAsChapter(
    { title: `Book ${index + 1}: ${title}`, headingLevel: 1 },
    book
  );
});

// Export
await trilogy.exportToFile('trilogy.epub');
```

### Merging with Custom Structure

```typescript
const merged = new EPUB3Builder({
  title: 'Anthology',
  creator: 'Various Authors',
  language: 'en',
});

// Create sections
const volumeId = merged.addChapter({
  title: 'Volume 1',
});

// Add EPUBs under the section
const story1 = await EPUB3Builder.parse('story1.epub');
merged.addEpubAsChapter(
  { title: 'First Story', parentId: volumeId, headingLevel: 2 },
  story1
);

const story2 = await EPUB3Builder.parse('story2.epub');
merged.addEpubAsChapter(
  { title: 'Second Story', parentId: volumeId, headingLevel: 2 },
  story2
);

await merged.exportToFile('anthology.epub');
```

**Note:** When merging EPUBs:
- All chapters, images, and stylesheets are automatically included
- Duplicate images are deduplicated by content hash
- Duplicate stylesheets are deduplicated
- Chapter hierarchy is preserved
- All internal links remain functional

## Converting EPUB 2 to EPUB 3

### Basic Conversion

```typescript
import { EPUB2Builder } from 'epub-editor';

// Parse EPUB 2 file
const epub2 = await EPUB2Builder.parse('legacy-book.epub');

console.log('EPUB 2 Metadata:');
console.log(epub2.getMetadata());

// Convert to EPUB 3
const epub3 = epub2.toEPUB3();

console.log('Converted to EPUB 3');
console.log(epub3.getMetadata());

// Export as EPUB 3
await epub3.exportToFile('modernized-book.epub');
```

### Conversion with Validation

```typescript
import { EPUB2Builder } from 'epub-editor';

// Parse EPUB 2
const epub2 = await EPUB2Builder.parse('old-book.epub');

// Validate original
const validation2 = epub2.validate();
console.log(`EPUB 2 Valid: ${validation2.isValid}`);
if (validation2.errors.length > 0) {
  console.log('Errors:', validation2.errors);
}

// Convert to EPUB 3
const epub3 = epub2.toEPUB3();

// Validate converted version
const validation3 = epub3.validate();
console.log(`EPUB 3 Valid: ${validation3.isValid}`);

// Export if valid
if (validation3.isValid) {
  await epub3.exportToFile('converted.epub');
} else {
  console.error('Conversion produced invalid EPUB 3');
}
```

### What Changes During Conversion

When converting from EPUB 2 to EPUB 3:

1. **Navigation**: NCX file (toc.ncx) → XHTML5 navigation document (nav.xhtml)
2. **Content Documents**: XHTML 1.1 → XHTML5
3. **Package Format**: OPF 2.0 → OPF 3.0
4. **Metadata**: Preserved exactly
5. **Images and Stylesheets**: Copied unchanged
6. **Chapter Structure**: Preserved with same hierarchy

## Advanced Examples

### Creating an Export to Buffer

```typescript
const epub = new EPUB3Builder({ title: 'My Book' });
epub.addChapter({ title: 'Chapter 1', content: '<p>Content</p>' });

// Export to buffer instead of file
const buffer = await epub.exportToBuffer();

// Use the buffer (e.g., upload to server, send via API)
console.log(`EPUB size: ${buffer.length} bytes`);
```

### Working with Chapter IDs

```typescript
const epub = new EPUB3Builder({ title: 'ID Example' });

// IDs are returned when adding chapters
const ch1 = epub.addChapter({ title: 'Chapter 1' });
const ch2 = epub.addChapter({ title: 'Chapter 2' });
const ch3 = epub.addChapter({ title: 'Chapter 3' });

console.log('Chapter IDs:', ch1, ch2, ch3);

// Use ID to add nested content
const section = epub.addChapter({
  title: 'Section 1.1',
  parentId: ch1,
  content: '<p>Nested under Chapter 1</p>',
});

// Get chapter details by ID
const chapters = epub.getAllChapters();
const chapter1 = chapters.find(ch => ch.id === ch1);
console.log(chapter1);
```

### Getting Root Chapters Only

```typescript
const epub = new EPUB3Builder({ title: 'Hierarchical Book' });

const part1 = epub.addChapter({ title: 'Part I' });
epub.addChapter({ title: 'Chapter 1', parentId: part1 });
epub.addChapter({ title: 'Chapter 2', parentId: part1 });

const part2 = epub.addChapter({ title: 'Part II' });
epub.addChapter({ title: 'Chapter 3', parentId: part2 });

// Get only top-level chapters
const rootChapters = epub.getRootChapters();
console.log(rootChapters.length); // 2 (Part I and Part II)

// Each root chapter has children
rootChapters.forEach(chapter => {
  console.log(`${chapter.title} has ${chapter.children.length} children`);
});
```

### Custom Heading Levels

```typescript
const epub = new EPUB3Builder({ title: 'Custom Headings' });

epub.addChapter({
  title: 'Part Name',
  headingLevel: 1, // Will use <h1>
  content: '<p>Part introduction</p>',
});

epub.addChapter({
  title: 'Chapter Name',
  headingLevel: 2, // Will use <h2>
  content: '<p>Chapter content</p>',
});

epub.addChapter({
  title: 'Section Name',
  headingLevel: 3, // Will use <h3>
  content: '<p>Section content</p>',
});
```

## Error Handling

### Handling Parse Errors

```typescript
import { EPUB3Builder } from 'epub-editor';

try {
  const epub = await EPUB3Builder.parse('book.epub');
  console.log('Successfully parsed');
} catch (error) {
  console.error('Failed to parse EPUB:', error.message);
  // Handle error appropriately
}
```

### Handling Invalid Parent IDs

```typescript
const epub = new EPUB3Builder({ title: 'Book' });

try {
  // This will throw an error if parent ID doesn't exist
  epub.addChapter({
    title: 'Child Chapter',
    parentId: 'non-existent-id',
    content: '<p>Content</p>',
  });
} catch (error) {
  console.error('Error:', error.message);
  // Error: Parent chapter with id "non-existent-id" not found
}
```

### Validation Before Export

```typescript
const epub = new EPUB3Builder({ title: 'My Book' });

// Add content...
epub.addChapter({ title: 'Chapter 1', content: '<p>Content</p>' });

// Validate before exporting
const validation = epub.validate();

if (!validation.isValid) {
  console.error('EPUB has errors:');
  validation.errors.forEach(error => console.error('  -', error));
  
  if (validation.warnings.length > 0) {
    console.warn('EPUB has warnings:');
    validation.warnings.forEach(warn => console.warn('  -', warn));
  }
  
  // Don't export if invalid
  return;
}

// Safe to export
await epub.exportToFile('validated-book.epub');
console.log('EPUB exported successfully');
```

### Handling File System Errors

```typescript
import * as fs from 'fs-extra';

try {
  // Ensure output directory exists
  await fs.ensureDir('./output');
  
  const epub = new EPUB3Builder({ title: 'Book' });
  epub.addChapter({ title: 'Chapter 1' });
  
  await epub.exportToFile('./output/book.epub');
  
  console.log('Export successful');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found');
  } else if (error.code === 'EACCES') {
    console.error('Permission denied');
  } else {
    console.error('Export failed:', error.message);
  }
}
```

## Tips and Best Practices

### 1. Always Set Language
```typescript
// Good: Language specified
const epub = new EPUB3Builder({
  title: 'Book',
  language: 'en', // Required for valid EPUB
});
```

### 2. Use Semantic HTML
```typescript
// Good: Semantic markup
epub.addChapter({
  title: 'Chapter',
  content: `
    <p>Paragraph text.</p>
    <h2>Subheading</h2>
    <p>More text.</p>
    <ul>
      <li>List item</li>
    </ul>
  `,
});
```

### 3. Organize Resources
```typescript
// Good: Descriptive filenames
epub.addImage({ filename: 'chapter1-diagram.png', data });
epub.addImage({ filename: 'chapter2-photo.jpg', data });
epub.addStylesheet({ filename: 'chapter-styles.css', content });
```

### 4. Validate Before Distribution
```typescript
// Always validate before publishing
const validation = epub.validate();
if (validation.isValid) {
  await epub.exportToFile('ready-for-distribution.epub');
}
```

### 5. Use Meaningful Chapter Titles
```typescript
// Good: Clear, descriptive titles
epub.addChapter({ title: 'Chapter 1: The Journey Begins' });
epub.addChapter({ title: 'Chapter 2: Unexpected Challenges' });

// Avoid: Generic titles
// epub.addChapter({ title: 'Chapter 1' });
```

## See Also

- [API Reference](API_REFERENCE.md) - Detailed API documentation
- [Testing Guide](TESTING.md) - Test suite information
- [Main README](../README.md) - Project overview
