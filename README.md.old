# EPUB Editor

A comprehensive TypeScript library for creating, parsing, and manipulating EPUB files.

This library has been drafted using the official EPUB specification, programmed using Copilot + Claude Sonnet 4.5, and expanded, reviewed, debugged and fixed by me.

## Features

### EPUB3Builder - Create and Edit EPUB Files

- ✅ **EPUB 3.3 Compliant** - Fully supports the latest EPUB specification
- ✅ **Create EPUBs from Scratch** - Easy-to-use API for building new EPUB files
- ✅ **Parse Existing EPUBs** - Load and edit existing EPUB files
- ✅ **Nested Chapters** - Support for hierarchical chapter structures
- ✅ **Image Management** - Add and manage images (JPEG, PNG, GIF, SVG, WebP)
- ✅ **Custom Styling** - Add custom CSS stylesheets (includes default styles)
- ✅ **Dublin Core Metadata** - Full support for EPUB metadata
- ✅ **Automatic Navigation** - Auto-generates navigation documents from chapter structure
- ✅ **Validation** - Built-in EPUB structure validation
- ✅ **TypeScript Types** - Complete TypeScript type definitions

## Installation

```bash
npm install
```

## Quick Start

### Creating a New EPUB

```typescript
import { EPUB3Builder } from './src';

// Create a new EPUB
const epub = new EPUB3Builder({
  title: 'My First Book',
  creator: 'John Doe',
  language: 'en',
  publisher: 'Self Published',
});

// Add chapters
const chapter1 = epub.addChapter({
  title: 'Chapter 1: Introduction',
  content: '<p>Welcome to my book!</p>',
});

// Add nested chapters
epub.addChapter({
  title: 'Section 1.1: Getting Started',
  parentId: chapter1,
  content: "<p>Let's begin...</p>",
});

// Add an image
const coverImage = await fs.readFile('cover.jpg');
epub.addImage({
  filename: 'cover.jpg',
  data: coverImage,
  isCover: true,
});

// Export the EPUB
await epub.exportToFile('my-book.epub');
```

### Parsing and Editing an Existing EPUB

```typescript
import { EPUB3Builder } from './src';

// Load existing EPUB
const epub = await EPUB3Builder.parse('existing-book.epub');

// Get metadata
const metadata = epub.getMetadata();
console.log(`Title: ${metadata.title}`);

// Add a new chapter
epub.addChapter({
  title: 'Bonus Chapter',
  content: '<p>Additional content</p>',
});

// Export modified EPUB
await epub.exportToFile('modified-book.epub');
```

## Examples

See [EPUB_BUILDER_EXAMPLES.md](EPUB_BUILDER_EXAMPLES.md) for comprehensive examples including:

- Basic EPUB creation
- Nested chapter structures
- Adding images and styling
- Parsing existing EPUBs
- Complete real-world examples
- Error handling
- Best practices

## Key Features in Detail

### Automatic Navigation Document

The EPUB3Builder automatically generates a compliant EPUB 3.3 Navigation Document based on your chapter structure:

```typescript
const part1 = epub.addChapter({ title: 'Part I' });
const chapter1 = epub.addChapter({ title: 'Chapter 1', parentId: part1 });
const section1 = epub.addChapter({ title: 'Section 1.1', parentId: chapter1 });

// Automatically creates:
// Part I
//   └─ Chapter 1
//      └─ Section 1.1
```

### Flexible Image Management

```typescript
// From file
const image1 = await fs.readFile('photo.jpg');
epub.addImage({ filename: 'photo.jpg', data: image1 });

// From base64
epub.addImage({
  filename: 'icon.png',
  data: 'iVBORw0KGgoAAAANSUhEUg...',
});

// Reference in content
epub.addChapter({
  content: '<img src="../images/photo.jpg" alt="Photo"/>',
});
```

### Custom Styling

```typescript
// Add your own CSS
epub.addStylesheet({
  filename: 'custom.css',
  content: `
    body { font-family: Georgia, serif; }
    h1 { color: #2c3e50; }
  `,
});

// Default styles are automatically included
// Supports all standard CSS properties
```

### Graceful Parsing

```typescript
try {
  const epub = await EPUB3Builder.parse('book.epub');
  // Successfully parsed
} catch (error) {
  console.error('Failed to parse:', error.message);
  // Provides descriptive error messages
}
```

## EPUB 3.3 Compliance

This library generates fully compliant EPUB 2.0.1 and EPUB 3.3 files including:

- ✅ Proper mimetype file (uncompressed, first in ZIP)
- ✅ META-INF/container.xml with correct structure
- ✅ Package Document (OPF) with full Dublin Core metadata
- ✅ Navigation Document with hierarchical TOC
- ✅ Valid XHTML5 content documents
- ✅ Proper manifest and spine declarations
- ✅ Correct MIME types for all resources

## Dependencies

- `jszip` - ZIP file creation and parsing
- `xml2js` - XML parsing
- `fs-extra` - Enhanced file system operations

All dependencies are already installed in the project.

## Validation

Built-in validation checks:

- Required metadata presence
- Chapter structure integrity
- Parent-child relationships
- File naming conventions
- MIME type correctness

```typescript
const validation = epub.validate();
if (!validation.isValid) {
  console.error('Errors:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

## Testing

The library includes comprehensive type definitions and handles edge cases gracefully:

- Invalid parent IDs throw descriptive errors
- Missing required metadata is caught early
- Image format validation
- Proper XML escaping
- Buffer and string input handling

## Contributing

Contributions are welcome! Please ensure:

1. TypeScript types are properly defined
2. EPUB 3.3 compliance is maintained
3. Error messages are descriptive
4. Examples are updated for new features

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
- [EPUB Navigation Document Types Documentation](src/types/README.md)
- [Comprehensive Examples](EPUB_BUILDER_EXAMPLES.md)
- [Dublin Core Metadata](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
