# API Reference

Complete API documentation for the EPUB Editor library.

## Table of Contents

- [Classes](#classes)
  - [EPUB3Builder](#epub3builder)
  - [EPUB2Builder](#epub2builder)
- [Interfaces](#interfaces)
- [Methods](#methods)
  - [Constructor](#constructor)
  - [Metadata Methods](#metadata-methods)
  - [Chapter Methods](#chapter-methods)
  - [Image Methods](#image-methods)
  - [Stylesheet Methods](#stylesheet-methods)
  - [Export Methods](#export-methods)
  - [Parsing Methods](#parsing-methods)
  - [Merging Methods](#merging-methods)
  - [Validation Methods](#validation-methods)
  - [Conversion Methods](#conversion-methods)

---

## Classes

### EPUB3Builder

Creates and manipulates EPUB 3.3 files.

```typescript
import { EPUB3Builder } from 'epub-editor';

const epub = new EPUB3Builder(metadata);
```

**Extends:** `BaseEPUBBuilder`

**Compliance:** EPUB 3.3 specification

**Features:**
- XHTML5 navigation document
- XHTML5 content documents
- OPF 3.0 package format
- Full semantic markup support

---

### EPUB2Builder

Creates and manipulates EPUB 2.0.1 files.

```typescript
import { EPUB2Builder } from 'epub-editor';

const epub = new EPUB2Builder(metadata);
```

**Extends:** `BaseEPUBBuilder`

**Compliance:** EPUB 2.0.1 specification

**Features:**
- NCX navigation (toc.ncx)
- XHTML 1.1 content documents
- OPF 2.0 package format
- Legacy device compatibility

**Additional Methods:**
- [`toEPUB3()`](#toepub3) - Convert to EPUB 3

---

## Interfaces

### DublinCoreMetadata

Metadata for EPUB files following the Dublin Core standard.

```typescript
interface DublinCoreMetadata {
  title: string;              // Required: Book title
  creator: string;            // Required: Author name
  language?: string;          // Language code (e.g., 'en', 'es')
  identifier?: string;        // Unique identifier (ISBN, UUID, etc.)
  date?: string;              // Publication date (ISO 8601: 'YYYY-MM-DD')
  publisher?: string;         // Publisher name
  description?: string;       // Book description/summary
  subject?: string | string[];// Subject/genre/keywords
  rights?: string;            // Copyright information
  contributor?: string | string[];
  type?: string;
  format?: string;
  source?: string;
  relation?: string;
  coverage?: string;
}
```

**Example:**
```typescript
const metadata: DublinCoreMetadata = {
  title: 'My Book',
  creator: 'Jane Doe',
  language: 'en',
  publisher: 'Self Published',
  date: '2026-02-18',
  identifier: 'urn:isbn:9781234567890',
  description: 'A comprehensive guide',
  subject: 'Fiction, Thriller',
  rights: '© 2026 Jane Doe',
};
```

---

### AddChapterOptions

Options for adding a chapter.

```typescript
interface AddChapterOptions {
  title: string;              // Chapter title
  content?: string;           // XHTML content
  parentId?: string;          // ID of parent chapter (for nesting)
  headingLevel?: number;      // Heading level (1-6), default: 2
  linear?: boolean;           // Include in linear reading order, default: true
  addTitleToContent?: boolean;// Auto-add title heading, default: true
}
```

**Example:**
```typescript
const chapterId = epub.addChapter({
  title: 'Chapter 1: Introduction',
  content: '<p>Welcome to the book.</p>',
  headingLevel: 2,
});
```

---

### AddImageOptions

Options for adding an image.

```typescript
interface AddImageOptions {
  filename: string;           // Image filename (e.g., 'cover.jpg')
  data: Buffer | string;      // Image data (Buffer or base64 string)
  alt?: string;               // Alt text for accessibility
  isCover?: boolean;          // Mark as cover image, default: false
}
```

**Supported formats:** JPEG, PNG, GIF, SVG, WebP

**Example:**
```typescript
import * as fs from 'fs-extra';

const imageData = await fs.readFile('image.jpg');
const imageId = epub.addImage({
  filename: 'image.jpg',
  data: imageData,
  alt: 'Description of image',
});
```

---

### AddStylesheetOptions

Options for adding a CSS stylesheet.

```typescript
interface AddStylesheetOptions {
  filename: string;           // Stylesheet filename (e.g., 'custom.css')
  content: string;            // CSS content
}
```

**Example:**
```typescript
const stylesheetId = epub.addStylesheet({
  filename: 'custom.css',
  content: 'body { font-family: Georgia, serif; }',
});
```

---

### Chapter

Chapter structure returned by getter methods.

```typescript
interface Chapter {
  id: string;                 // Unique chapter ID
  title: string;              // Chapter title
  content: string;            // XHTML content
  filename: string;           // Generated filename
  parentId?: string;          // Parent chapter ID
  order: number;              // Order in book
  children: Chapter[];        // Nested child chapters
  headingLevel: number;       // Heading level (1-6)
  linear?: boolean;           // In linear reading order
  addTitleToContent: boolean; // Title auto-added to content
}
```

---

### ImageResource

Image resource structure.

```typescript
interface ImageResource {
  id: string;                 // Unique image ID
  filename: string;           // Image filename
  data: Buffer;               // Image data
  mimeType: string;           // MIME type (e.g., 'image/jpeg')
  alt?: string;               // Alt text
  isCover?: boolean;          // Is cover image
}
```

---

### StylesheetResource

Stylesheet resource structure.

```typescript
interface StylesheetResource {
  id: string;                 // Unique stylesheet ID
  filename: string;           // Stylesheet filename
  content: string;            // CSS content
}
```

---

### ValidationResult

Result from validation.

```typescript
interface ValidationResult {
  isValid: boolean;           // True if EPUB is valid
  errors: string[];           // Array of error messages
  warnings: string[];         // Array of warning messages
}
```

**Example:**
```typescript
const validation = epub.validate();
console.log(`Valid: ${validation.isValid}`);
validation.errors.forEach(err => console.error(err));
```

---

### EPUBOptions

Options for parsing EPUBs.

```typescript
interface EPUBOptions {
  addDefaultStylesheet?: boolean;    // Add default styles, default: true
  titleExtraction?: TitleExtraction[]; // Title extraction strategy
}

type TitleExtraction = 'HEAD' | 'NAV' | 'CONTENT';
```

**Title Extraction:**
- `'HEAD'` - Extract from HTML `<title>` tag
- `'NAV'` - Extract from navigation document
- `'CONTENT'` - Extract from chapter content (first heading)

**Example:**
```typescript
const epub = await EPUB3Builder.parse('book.epub', {
  titleExtraction: ['CONTENT', 'NAV'],
});
```

---

## Methods

### Constructor

#### `new EPUB3Builder(metadata)` / `new EPUB2Builder(metadata)`

Creates a new EPUB builder instance.

**Parameters:**
- `metadata` (DublinCoreMetadata) - Book metadata

**Returns:** EPUB3Builder | EPUB2Builder instance

**Example:**
```typescript
const epub = new EPUB3Builder({
  title: 'My Book',
  creator: 'Author Name',
  language: 'en',
});
```

---

## Metadata Methods

### `setMetadata(metadata)`

Update metadata fields.

**Parameters:**
- `metadata` (Partial<DublinCoreMetadata>) - Metadata fields to update

**Returns:** void

**Example:**
```typescript
epub.setMetadata({
  title: 'Updated Title',
  description: 'New description',
  date: '2026-02-18',
});
```

---

### `getMetadata()`

Get current metadata.

**Returns:** DublinCoreMetadata

**Example:**
```typescript
const metadata = epub.getMetadata();
console.log(`Title: ${metadata.title}`);
console.log(`Author: ${metadata.creator}`);
```

---

## Chapter Methods

### `addChapter(options)`

Add a new chapter to the EPUB.

**Parameters:**
- `options` (AddChapterOptions) - Chapter configuration

**Returns:** string (Chapter ID)

**Example:**
```typescript
// Simple chapter
const ch1 = epub.addChapter({
  title: 'Chapter 1',
  content: '<p>Content here</p>',
});

// Nested chapter
const section = epub.addChapter({
  title: 'Section 1.1',
  parentId: ch1,
  content: '<p>Nested content</p>',
});
```

---

### `setChapterContent(chapterId, content)`

Replace chapter content.

**Parameters:**
- `chapterId` (string) - Chapter ID
- `content` (string) - New XHTML content

**Returns:** void

**Throws:** Error if chapter not found

**Example:**
```typescript
epub.setChapterContent('chapter-1', '<p>Replaced content</p>');
```

---

### `appendToChapter(chapterId, content)`

Append content to an existing chapter.

**Parameters:**
- `chapterId` (string) - Chapter ID
- `content` (string) - XHTML content to append

**Returns:** void

**Throws:** Error if chapter not found

**Example:**
```typescript
epub.appendToChapter('chapter-1', '<p>Additional paragraph</p>');
```

---

### `getChapter(chapterId)`

Get a specific chapter by ID.

**Parameters:**
- `chapterId` (string) - Chapter ID

**Returns:** Chapter | undefined

**Example:**
```typescript
const chapter = epub.getChapter('chapter-1');
if (chapter) {
  console.log(`Title: ${chapter.title}`);
  console.log(`Children: ${chapter.children.length}`);
}
```

---

### `getRootChapters()`

Get top-level chapters (no parent).

**Returns:** Chapter[]

**Example:**
```typescript
const roots = epub.getRootChapters();
roots.forEach(chapter => {
  console.log(`${chapter.title} (${chapter.children.length} children)`);
});
```

---

### `getAllChapters()`

Get all chapters in the EPUB.

**Returns:** Chapter[]

**Example:**
```typescript
const allChapters = epub.getAllChapters();
console.log(`Total chapters: ${allChapters.length}`);
```

---

### `deleteChapter(chapterId)`

Delete a chapter and all its children.

**Parameters:**
- `chapterId` (string) - Chapter ID to delete

**Returns:** void

**Throws:** Error if chapter not found

**Example:**
```typescript
epub.deleteChapter('chapter-1');
```

---

## Image Methods

### `addImage(options)`

Add an image to the EPUB.

**Parameters:**
- `options` (AddImageOptions) - Image configuration

**Returns:** string (Image ID)

**Example:**
```typescript
import * as fs from 'fs-extra';

const imageData = await fs.readFile('cover.jpg');
const imageId = epub.addImage({
  filename: 'cover.jpg',
  data: imageData,
  alt: 'Book cover',
  isCover: true,
});
```

---

### `getImage(imageId)`

Get a specific image by ID.

**Parameters:**
- `imageId` (string) - Image ID

**Returns:** ImageResource | undefined

**Example:**
```typescript
const image = epub.getImage('image-1');
if (image) {
  console.log(`Filename: ${image.filename}`);
  console.log(`MIME type: ${image.mimeType}`);
  console.log(`Size: ${image.data.length} bytes`);
}
```

---

### `getAllImages()`

Get all images in the EPUB.

**Returns:** ImageResource[]

**Example:**
```typescript
const images = epub.getAllImages();
console.log(`Total images: ${images.length}`);

images.forEach(img => {
  console.log(`- ${img.filename} (${img.mimeType})`);
});
```

---

### `deleteImage(imageId)`

Delete an image from the EPUB.

**Parameters:**
- `imageId` (string) - Image ID to delete

**Returns:** void

**Example:**
```typescript
epub.deleteImage('image-1');
```

---

## Stylesheet Methods

### `addStylesheet(options)`

Add a CSS stylesheet to the EPUB.

**Parameters:**
- `options` (AddStylesheetOptions) - Stylesheet configuration

**Returns:** string (Stylesheet ID)

**Example:**
```typescript
const styleId = epub.addStylesheet({
  filename: 'custom.css',
  content: `
    body { font-family: Georgia, serif; }
    h1 { color: #2c3e50; }
  `,
});
```

---

### `getAllStylesheets()`

Get all stylesheets in the EPUB.

**Returns:** StylesheetResource[]

**Example:**
```typescript
const stylesheets = epub.getAllStylesheets();
stylesheets.forEach(stylesheet => {
  console.log(`- ${stylesheet.filename}`);
});
```

**Note:** Includes the default stylesheet unless disabled during construction.

---

## Export Methods

### `exportToFile(filepath)`

Export EPUB to a file.

**Parameters:**
- `filepath` (string) - Output file path (e.g., 'book.epub')

**Returns:** Promise<void>

**Example:**
```typescript
await epub.exportToFile('my-book.epub');
console.log('EPUB exported successfully');
```

---

### `exportToBuffer()`

Export EPUB to a Buffer.

**Returns:** Promise<Buffer>

**Example:**
```typescript
const buffer = await epub.exportToBuffer();
console.log(`EPUB size: ${buffer.length} bytes`);

// Use buffer (upload, send via API, etc.)
```

---

## Parsing Methods

### `static parse(filepath, options?)`

Parse an existing EPUB file.

**Parameters:**
- `filepath` (string) - Path to EPUB file
- `options` (EPUBOptions, optional) - Parsing options

**Returns:** Promise<EPUB3Builder | EPUB2Builder>

**Example:**
```typescript
// EPUB 3
const epub3 = await EPUB3Builder.parse('book.epub');

// EPUB 2
const epub2 = await EPUB2Builder.parse('legacy-book.epub');

// With options
const epub = await EPUB3Builder.parse('book.epub', {
  titleExtraction: ['CONTENT', 'NAV'],
});
```

---

### `static parseBuffer(buffer, options?)`

Parse an EPUB from a Buffer.

**Parameters:**
- `buffer` (Buffer) - EPUB file data
- `options` (EPUBOptions, optional) - Parsing options

**Returns:** Promise<EPUB3Builder | EPUB2Builder>

**Example:**
```typescript
import * as fs from 'fs-extra';

const buffer = await fs.readFile('book.epub');
const epub = await EPUB3Builder.parseBuffer(buffer);
```

---

## Merging Methods

### `addEpubAsChapter(chapter, sourceEPUB)`

Add an entire EPUB as a chapter section.

**Parameters:**
- `chapter` (Omit<AddChapterOptions, 'content'>) - Chapter configuration for the section
- `sourceEPUB` (BaseEPUBBuilder) - Source EPUB to merge

**Returns:** string (Section chapter ID)

**Behavior:**
- Creates a new chapter as the section container
- Copies all chapters from source EPUB under this section
- Copies all images (deduplicates by content hash)
- Copies all stylesheets (deduplicates)
- Updates all internal references

**Example:**
```typescript
const book1 = await EPUB3Builder.parse('book1.epub');
const book2 = await EPUB3Builder.parse('book2.epub');

const series = new EPUB3Builder({
  title: 'Complete Series',
  creator: 'Author Name',
  language: 'en',
});

// Add books as sections
series.addEpubAsChapter({ title: 'Book 1', headingLevel: 1 }, book1);
series.addEpubAsChapter({ title: 'Book 2', headingLevel: 1 }, book2);

await series.exportToFile('complete-series.epub');
```

**Advanced Example:**
```typescript
// Nested merging
const anthology = new EPUB3Builder({
  title: 'Story Collection',
  creator: 'Various',
  language: 'en',
});

// Create volume
const volumeId = anthology.addChapter({ title: 'Volume 1' });

// Add stories under volume
const story1 = await EPUB3Builder.parse('story1.epub');
anthology.addEpubAsChapter(
  { title: 'First Story', parentId: volumeId, headingLevel: 2 },
  story1
);

const story2 = await EPUB3Builder.parse('story2.epub');
anthology.addEpubAsChapter(
  { title: 'Second Story', parentId: volumeId, headingLevel: 2 },
  story2
);
```

---

## Validation Methods

### `validate()`

Validate the EPUB structure and metadata.

**Returns:** ValidationResult

**Checks:**
- Required metadata fields (title, language, identifier)
- Chapter structure integrity
- Parent-child relationships
- Resource references
- Filename conventions

**Example:**
```typescript
const validation = epub.validate();

if (!validation.isValid) {
  console.error('EPUB has errors:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
}

if (validation.warnings.length > 0) {
  console.warn('EPUB has warnings:');
  validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
}

if (validation.isValid) {
  await epub.exportToFile('validated-book.epub');
}
```

---

## Conversion Methods

*(EPUB2Builder only)*

### `toEPUB3()`

Convert EPUB 2 to EPUB 3.

**Returns:** EPUB3Builder

**Conversions:**
- NCX navigation → XHTML5 navigation document
- XHTML 1.1 content → XHTML5 content
- OPF 2.0 → OPF 3.0
- Metadata preserved exactly
- Images and stylesheets copied
- Chapter hierarchy preserved

**Example:**
```typescript
import { EPUB2Builder } from 'epub-editor';

// Parse EPUB 2
const epub2 = await EPUB2Builder.parse('legacy-book.epub');

// Convert to EPUB 3
const epub3 = epub2.toEPUB3();

// Validate conversion
const validation = epub3.validate();
console.log(`Valid EPUB 3: ${validation.isValid}`);

// Export
await epub3.exportToFile('modernized-book.epub');
```

---

## Type Exports

All interfaces and types are exported from the main module:

```typescript
import {
  EPUB2Builder,
  EPUB3Builder,
  DublinCoreMetadata,
  Chapter,
  ImageResource,
  StylesheetResource,
  AddChapterOptions,
  AddImageOptions,
  AddStylesheetOptions,
  ValidationResult,
  EPUBOptions,
} from 'epub-editor';
```

---

## Error Handling

The library throws descriptive errors for invalid operations:

```typescript
// Invalid parent ID
try {
  epub.addChapter({
    title: 'Child',
    parentId: 'non-existent-id',
  });
} catch (error) {
  console.error(error.message);
  // "Parent chapter with id 'non-existent-id' not found"
}

// Invalid chapter ID
try {
  epub.setChapterContent('missing-id', '<p>Content</p>');
} catch (error) {
  console.error(error.message);
  // "Chapter with id 'missing-id' not found"
}

// Parse errors
try {
  const epub = await EPUB3Builder.parse('corrupt-file.epub');
} catch (error) {
  console.error('Parse failed:', error.message);
}
```

---

## See Also

- [Main README](../README.md) - Project overview
- [Examples](EPUB_BUILDER_EXAMPLES.md) - Comprehensive code examples
- [Testing Guide](TESTING.md) - Test suite documentation
