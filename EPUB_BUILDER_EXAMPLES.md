# EPUB Builder Examples

Comprehensive examples for using the EPUBBuilder class to create and manipulate EPUB 3.3 files.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Adding Chapters](#adding-chapters)
- [Nested Chapters](#nested-chapters)
- [Adding Images](#adding-images)
- [Custom Styling](#custom-styling)
- [Metadata Management](#metadata-management)
- [Parsing Existing EPUBs](#parsing-existing-epubs)
- [Complete Example](#complete-example)

## Basic Usage

### Creating a Simple EPUB

```typescript
import { EPUBBuilder } from './src';

// Create a new EPUB
const epub = new EPUBBuilder({
  title: 'My First Book',
  creator: 'John Doe',
  language: 'en',
});

// Add a chapter
const chapter1Id = epub.addChapter({
  title: 'Introduction',
  content: `
    <p>Welcome to my book! This is the first chapter.</p>
    <p>It contains some introductory content.</p>
  `,
});

// Export to file
await epub.exportToFile('my-first-book.epub');
```

## Adding Chapters

### Adding Multiple Chapters

```typescript
const epub = new EPUBBuilder({
  title: 'Complete Guide',
  creator: 'Jane Smith',
});

// Add chapters sequentially
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

// Or append content
epub.appendToChapter(chapterId, '<p>Additional paragraph.</p>');
```

### Custom Heading Levels

```typescript
epub.addChapter({
  title: 'Part I',
  headingLevel: 1,
  content: '<p>Introduction to Part I</p>',
});

epub.addChapter({
  title: 'Chapter 1',
  headingLevel: 2,
  content: '<p>Chapter content</p>',
});
```

## Nested Chapters

### Creating a Hierarchical Structure

```typescript
const epub = new EPUBBuilder({
  title: 'Comprehensive Guide',
  creator: 'Author Name',
});

// Add main chapter
const part1 = epub.addChapter({
  title: 'Part I: Fundamentals',
  content: '<p>Introduction to Part I</p>',
});

// Add nested chapters
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

// Add sub-sections to chapters
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

// Add another top-level part
const part2 = epub.addChapter({
  title: 'Part II: Advanced Topics',
  content: '<p>Introduction to Part II</p>',
});

epub.addChapter({
  title: 'Chapter 3: Expert Level',
  parentId: part2,
  content: '<p>Advanced content</p>',
});
```

### Navigation Document Structure

The nested structure automatically creates a hierarchical table of contents:

```
Table of Contents
├─ Part I: Fundamentals
│  ├─ Chapter 1: Basics
│  │  ├─ Section 1.1: Core Concepts
│  │  └─ Section 1.2: Practical Examples
│  └─ Chapter 2: Intermediate
└─ Part II: Advanced Topics
   └─ Chapter 3: Expert Level
```

## Adding Images

### Adding Images to EPUB

```typescript
import * as fs from 'fs-extra';

const epub = new EPUBBuilder({
  title: 'Photo Book',
  creator: 'Photographer',
});

// Add cover image
const coverData = await fs.readFile('cover.jpg');
const coverId = epub.addImage({
  filename: 'cover.jpg',
  data: coverData,
  isCover: true,
  alt: 'Book Cover',
});

// Add content images
const imageData = await fs.readFile('diagram.png');
const imageId = epub.addImage({
  filename: 'diagram.png',
  data: imageData,
  alt: 'System Diagram',
});

// Reference image in chapter
epub.addChapter({
  title: 'Chapter with Images',
  content: `
    <p>Here is a diagram:</p>
    <figure>
      <img src="../images/diagram.png" alt="System Diagram"/>
      <figcaption>Figure 1: System Architecture</figcaption>
    </figure>
    <p>The diagram shows the system structure.</p>
  `,
});
```

### Adding Base64 Images

```typescript
// Add image from base64 string
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAUA...';
epub.addImage({
  filename: 'icon.png',
  data: base64Image,
  alt: 'Application Icon',
});
```

## Custom Styling

### Adding Custom CSS

```typescript
const epub = new EPUBBuilder({
  title: 'Styled Book',
  creator: 'Designer',
});

// Add custom stylesheet
const customCSS = `
  body {
    font-family: 'Times New Roman', serif;
    font-size: 1.1em;
    line-height: 1.8;
    text-align: justify;
  }
  
  h1 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.5em;
  }
  
  blockquote {
    border-left: 4px solid #3498db;
    padding-left: 1.5em;
    font-style: italic;
    color: #555;
  }
  
  .highlight {
    background-color: #fff3cd;
    padding: 0.2em 0.4em;
  }
`;

epub.addStylesheet({
  filename: 'custom.css',
  content: customCSS,
});

// Use custom classes in content
epub.addChapter({
  title: 'Styled Chapter',
  content: `
    <p>This is normal text.</p>
    <p class="highlight">This text is highlighted!</p>
    <blockquote>
      This is a styled blockquote.
    </blockquote>
  `,
});
```

## Metadata Management

### Complete Metadata Example

```typescript
const epub = new EPUBBuilder({
  title: 'The Complete Guide to Everything',
  creator: 'John Doe',
  language: 'en',
  identifier: 'urn:uuid:12345678-1234-1234-1234-123456789012',
  date: '2024-01-15',
  publisher: 'Example Press',
  description: 'A comprehensive guide covering all aspects of the subject.',
  subject: ['Technology', 'Education', 'Reference'],
  rights: 'Copyright © 2024 John Doe. All rights reserved.',
  contributor: ['Jane Smith', 'Bob Johnson'],
});

// Update metadata later
epub.setMetadata({
  publisher: 'Updated Publisher Name',
  description: 'An updated description of the book.',
});

// Get current metadata
const metadata = epub.getMetadata();
console.log(`Title: ${metadata.title}`);
console.log(`Author: ${metadata.creator}`);
```

## Parsing Existing EPUBs

### Loading and Editing an EPUB

```typescript
// Parse existing EPUB
const epub = await EPUBBuilder.parse('existing-book.epub');

// Get metadata
const metadata = epub.getMetadata();
console.log(`Loaded: ${metadata.title} by ${metadata.creator}`);

// Get chapters
const chapters = epub.getRootChapters();
console.log(`Found ${chapters.length} chapters`);

// Add new chapter
epub.addChapter({
  title: 'Bonus Chapter',
  content: '<p>Additional content added after publication.</p>',
});

// Modify existing chapter
const firstChapter = chapters[0];
if (firstChapter) {
  epub.appendToChapter(firstChapter.id, '<p>Appended content.</p>');
}

// Export modified EPUB
await epub.exportToFile('modified-book.epub');
```

### Parsing from Buffer

```typescript
import * as fs from 'fs-extra';

const buffer = await fs.readFile('book.epub');
const epub = await EPUBBuilder.parseBuffer(buffer);

// Work with the parsed EPUB
const metadata = epub.getMetadata();
console.log(metadata);
```

## Complete Example

### Creating a Full-Featured Book

```typescript
import { EPUBBuilder } from './src';
import * as fs from 'fs-extra';

async function createBook() {
  // Initialize EPUB with metadata
  const epub = new EPUBBuilder({
    title: 'The Art of Programming',
    creator: 'Ada Lovelace',
    language: 'en',
    publisher: 'Tech Books Publishing',
    description: 'A comprehensive guide to modern programming practices.',
    subject: ['Programming', 'Computer Science', 'Software Development'],
    rights: 'Copyright © 2024 Ada Lovelace',
    date: '2024-01-20',
  });

  // Add cover image
  const coverImage = await fs.readFile('./assets/cover.jpg');
  epub.addImage({
    filename: 'cover.jpg',
    data: coverImage,
    isCover: true,
    alt: 'The Art of Programming - Cover',
  });

  // Add custom styles
  const customCSS = `
    .code-block {
      background-color: #f4f4f4;
      border-left: 3px solid #333;
      padding: 1em;
      font-family: monospace;
      overflow-x: auto;
    }
    .tip {
      background-color: #e8f4f8;
      border: 1px solid #b8dce8;
      padding: 1em;
      margin: 1em 0;
    }
  `;
  
  epub.addStylesheet({
    filename: 'code-styles.css',
    content: customCSS,
  });

  // Create book structure
  const intro = epub.addChapter({
    title: 'Introduction',
    headingLevel: 1,
    content: `
      <p>Welcome to <em>The Art of Programming</em>!</p>
      <p>This book will teach you the fundamental principles of programming.</p>
    `,
  });

  const part1 = epub.addChapter({
    title: 'Part I: Fundamentals',
    headingLevel: 1,
    content: '<p>In this part, we cover the basics.</p>',
  });

  const chapter1 = epub.addChapter({
    title: 'Chapter 1: Getting Started',
    parentId: part1,
    headingLevel: 2,
    content: `
      <p>Let's begin with the basics of programming.</p>
      <div class="tip">
        <strong>Tip:</strong> Always write clean, readable code.
      </div>
    `,
  });

  epub.addChapter({
    title: 'Variables and Data Types',
    parentId: chapter1,
    headingLevel: 3,
    content: `
      <p>Variables are containers for storing data values.</p>
      <pre class="code-block">
let name = "Ada";
let age = 30;
const PI = 3.14159;
      </pre>
    `,
  });

  epub.addChapter({
    title: 'Control Structures',
    parentId: chapter1,
    headingLevel: 3,
    content: `
      <p>Control structures determine the flow of your program.</p>
      <pre class="code-block">
if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}
      </pre>
    `,
  });

  const chapter2 = epub.addChapter({
    title: 'Chapter 2: Functions',
    parentId: part1,
    headingLevel: 2,
    content: '<p>Functions are reusable blocks of code.</p>',
  });

  // Add diagram image
  const diagramImage = await fs.readFile('./assets/function-diagram.png');
  epub.addImage({
    filename: 'function-diagram.png',
    data: diagramImage,
    alt: 'Function Flow Diagram',
  });

  epub.addChapter({
    title: 'Defining Functions',
    parentId: chapter2,
    headingLevel: 3,
    content: `
      <p>Here's how to define a function:</p>
      <pre class="code-block">
function greet(name) {
  return "Hello, " + name + "!";
}
      </pre>
      <figure>
        <img src="../images/function-diagram.png" alt="Function Flow"/>
        <figcaption>Figure 1: How functions work</figcaption>
      </figure>
    `,
  });

  const part2 = epub.addChapter({
    title: 'Part II: Advanced Concepts',
    headingLevel: 1,
    content: '<p>Now let\'s explore advanced topics.</p>',
  });

  epub.addChapter({
    title: 'Chapter 3: Object-Oriented Programming',
    parentId: part2,
    headingLevel: 2,
    content: `
      <p>OOP is a programming paradigm based on objects.</p>
      <pre class="code-block">
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    return \`Hello, I'm \${this.name}\`;
  }
}
      </pre>
    `,
  });

  // Validate before export
  const validation = epub.validate();
  if (!validation.isValid) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }

  // Export the EPUB
  await epub.exportToFile('the-art-of-programming.epub');
  console.log('✅ EPUB created successfully!');

  // Also export as buffer for additional processing
  const buffer = await epub.export();
  console.log(`📦 EPUB size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

createBook().catch(console.error);
```

## Error Handling

### Graceful Error Handling

```typescript
async function safeEPUBCreation() {
  try {
    const epub = new EPUBBuilder({
      title: 'My Book',
      creator: 'Author',
    });

    // Try to add chapter with invalid parent
    try {
      epub.addChapter({
        title: 'Chapter',
        parentId: 'non-existent-id',
      });
    } catch (error) {
      console.error('Failed to add chapter:', error.message);
      // Continue with other operations
    }

    // Validate before export
    const validation = epub.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    await epub.exportToFile('output.epub');
  } catch (error) {
    console.error('EPUB creation failed:', error);
  }
}
```

## Testing Your EPUB

### Validate and Inspect

```typescript
const epub = new EPUBBuilder({
  title: 'Test Book',
  creator: 'Tester',
});

epub.addChapter({
  title: 'Test Chapter',
  content: '<p>Test content</p>',
});

// Validate
const validation = epub.validate();
console.log('Valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);

// Inspect structure
console.log('Chapters:', epub.getRootChapters().length);
console.log('Metadata:', epub.getMetadata());

// Export for testing
await epub.exportToFile('test.epub', {
  validate: true,
  compression: 9,
});
```

## Tips and Best Practices

1. **Always validate before export** - Use `epub.validate()` to catch issues early
2. **Use semantic HTML** - Structure content with proper headings and sections
3. **Optimize images** - Compress images before adding to reduce file size
4. **Test on multiple readers** - Different EPUB readers may render content differently
5. **Use relative paths for resources** - Images and stylesheets use relative paths
6. **Provide meaningful titles** - Chapter titles appear in the navigation
7. **Handle errors gracefully** - Wrap operations in try-catch blocks
8. **Set proper metadata** - Complete metadata improves discoverability

## License

BSD
