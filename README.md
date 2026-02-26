# EPUB Editor

A comprehensive TypeScript library for creating, parsing, and manipulating EPUB files. Supports both EPUB 2.0.1 and EPUB 3.3 specifications.

This library has been drafted using the official EPUB specifications, programmed using Copilot + Claude Sonnet 4.5, and expanded, reviewed, debugged and fixed by me.

## Features

- ✅ **Dual Format Support** - Full support for EPUB 2.0.1 and EPUB 3.3
- ✅ **Create EPUBs** - Build new EPUB files from scratch with an easy-to-use API
- ✅ **Parse EPUBs** - Load and edit existing EPUB files
- ✅ **Merge EPUBs** - Combine multiple EPUB files into a single book
- ✅ **Convert Formats** - Convert EPUB 2 to EPUB 3
- ✅ **Nested Chapters** - Hierarchical chapter structures with unlimited nesting
- ✅ **Resource Management** - Images (JPEG, PNG, GIF, SVG, WebP) and CSS stylesheets
- ✅ **Automatic Navigation** - Auto-generated TOC/NCX from chapter structure
- ✅ **Dublin Core Metadata** - Full metadata support
- ✅ **Validation** - Built-in EPUB structure validation
- ✅ **TypeScript** - Complete type definitions included

## Installation

```bash
npm install epub-editor-ts
```

## Quick Start

### Choose Your Format

```typescript
import { EPUB3Builder, EPUB2Builder } from 'epub-editor-ts';

// For modern ereaders (recommended)
const epub = new EPUB3Builder({ title: 'My Book', creator: 'Author' });

// For legacy ereaders
const epub = new EPUB2Builder({ title: 'My Book', creator: 'Author' });
```

## Common Use Cases

### 📝 Create a New EPUB

```typescript
import { EPUB3Builder } from 'epub-editor-ts';
import * as fs from 'fs-extra';

const epub = new EPUB3Builder({
  title: 'My First Book',
  creator: 'John Doe',
  language: 'en',
  publisher: 'Self Published',
});

// Add chapters
epub.addChapter({
  title: 'Chapter 1: Introduction',
  content: '<p>Welcome to my book!</p>',
});

// Add an image
const coverImage = await fs.readFile('cover.jpg');
epub.addImage({
  filename: 'cover.jpg',
  data: coverImage,
  isCover: true,
});

// Export
await epub.exportToFile('my-book.epub');
```

### 📖 Parse and Edit an Existing EPUB

```typescript
import { EPUB3Builder, EPUB2Builder } from 'epub-editor-ts';

// Parse (automatically detects EPUB 2 or 3)
const epub = await EPUB3Builder.parse('existing-book.epub');

// View metadata
const metadata = epub.getMetadata();
console.log(`Title: ${metadata.title}`);
console.log(`Author: ${metadata.creator}`);

// Add content
epub.addChapter({
  title: 'Bonus Chapter',
  content: '<p>Additional content</p>',
});

// Export modified version
await epub.exportToFile('modified-book.epub');
```

### 🔀 Merge Multiple EPUBs

Combine multiple EPUB files into a single book, perfect for creating series compilations or omnibus editions.

```typescript
import { EPUB3Builder } from 'epub-editor-ts';

// Parse source EPUBs
const book1 = await EPUB3Builder.parse('book1.epub');
const book2 = await EPUB3Builder.parse('book2.epub');
const book3 = await EPUB3Builder.parse('book3.epub');

// Create merged EPUB
const series = new EPUB3Builder({
  title: 'Complete Trilogy',
  creator: 'Author Name',
  language: 'en',
});

// Add each book as a top-level section
series.addEpubAsChapter({ title: 'Book 1: The Beginning' }, book1);
series.addEpubAsChapter({ title: 'Book 2: The Middle' }, book2);
series.addEpubAsChapter({ title: 'Book 3: The End' }, book3);

// Export merged book
await series.exportToFile('complete-trilogy.epub');
```

### 🔄 Convert EPUB 2 to EPUB 3

```typescript
import { EPUB2Builder } from 'epub-editor-ts';

// Parse EPUB 2 file
const epub2 = await EPUB2Builder.parse('old-book.epub');

// Convert to EPUB 3
const epub3 = epub2.toEPUB3();

// Export as EPUB 3
await epub3.exportToFile('modernized-book.epub');
```

### 🌳 Create Nested Chapter Structures

Build complex hierarchical tables of contents with parts, chapters, and sections.

```typescript
const epub = new EPUB3Builder({ title: 'Advanced Guide' });

// Create hierarchy
const part1 = epub.addChapter({ title: 'Part I: Fundamentals' });
const chapter1 = epub.addChapter({
  title: 'Chapter 1: Basics',
  parentId: part1,
  content: '<p>Basic concepts</p>',
});
const section1 = epub.addChapter({
  title: 'Section 1.1: Core Concepts',
  parentId: chapter1,
  content: '<p>Core concept details</p>',
});

// Automatically creates:
// Part I: Fundamentals
//   └─ Chapter 1: Basics
//      └─ Section 1.1: Core Concepts
```

## Documentation

- [**API Reference**](docs/API_REFERENCE.md) - Complete API documentation
- [**Comprehensive Examples**](docs/EPUB_BUILDER_EXAMPLES.md) - Detailed code examples
- [**Testing Guide**](docs/TESTING.md) - Information about the test suite

## EPUB Specification Compliance

### EPUB 3.3 (via EPUB3Builder)
- ✅ XHTML5 navigation document
- ✅ XHTML5 content documents
- ✅ OPF 3.0 package format
- ✅ Proper semantic markup

### EPUB 2.0.1 (via EPUB2Builder)
- ✅ NCX navigation (toc.ncx)
- ✅ XHTML 1.1 content documents
- ✅ OPF 2.0 package format
- ✅ Full backward compatibility

### Both Formats
- ✅ Proper mimetype file (uncompressed, first in ZIP)
- ✅ META-INF/container.xml with correct structure
- ✅ Full Dublin Core metadata support
- ✅ Hierarchical table of contents
- ✅ Proper manifest and spine declarations
- ✅ Correct MIME types for all resources

## Testing

The library includes a comprehensive test suite with:
- **87+ tests** covering creation, parsing, editing, and merging
- **Reference file comparisons** to ensure output quality
- **Parameterized tests** running on both EPUB 2 and EPUB 3
- **Validation tests** for metadata and structure integrity

```bash
npm test
```

See [docs/TESTING.md](docs/TESTING.md) for details.

## Dependencies

- `jszip` - ZIP file creation and parsing
- `xml2js` - XML parsing and building
- `uuid` - Unique identifier generation
- `fs-extra` - Enhanced file system operations

## Validation

Built-in validation for structure and metadata:

```typescript
const validation = epub.validate();
if (!validation.isValid) {
  console.error('Errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

Validation checks:
- Required metadata fields (title, language, identifier)
- Chapter structure integrity
- Parent-child relationships
- Resource references
- File naming conventions

## Contributing

Contributions are welcome! Please ensure:
1. TypeScript types are properly defined
2. EPUB 2 and 3 compliance is maintained
3. Tests pass for both formats
4. Error messages are descriptive
5. Examples are updated for new features

Besides fully programmed contributions, suggestions can be added in this board: https://github.com/users/daxadal/projects/1

## License

MIT

## Author

Eric García de Ceca <e.garciadececa@gmail.com>

## Repository

https://github.com/daxadal/epub-editor

---

## Additional Resources

- [EPUB 3.3 Specification](https://www.w3.org/TR/epub-33/)
- [EPUB 2.0.1 Specification](https://idpf.org/epub/201)
- [Dublin Core Metadata](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
