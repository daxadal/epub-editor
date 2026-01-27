# EPUB 3.3 Navigation Document Types

TypeScript type definitions for EPUB 3.3 Navigation Documents, based on the [W3C EPUB 3.3 Specification, Section 7](https://www.w3.org/TR/epub-33/#sec-nav).

## Overview

The EPUB Navigation Document is a mandatory component of an EPUB publication that provides human- and machine-readable global navigation. It's a specialized XHTML content document that defines:

- **Table of Contents (toc)** - Required, the primary navigation hierarchy
- **Page List (page-list)** - Optional, navigation to static page boundaries
- **Landmarks** - Optional, fundamental structural components for quick access
- **Custom Navigation** - Optional, any additional navigation aids

## Usage

```typescript
import {
  EPUBNavigationDocument,
  TocNav,
  PageListNav,
  LandmarksNav,
  NavListItem,
} from './types';

// Example: Complete navigation document
const navDoc: EPUBNavigationDocument = {
  metadata: {
    title: 'Navigation',
    lang: 'en',
    xmlns: 'http://www.w3.org/1999/xhtml',
  },

  // Required: Table of Contents
  toc: {
    'epub:type': 'toc',
    heading: {
      level: 1,
      content: 'Table of Contents',
      id: 'toc-heading',
    },
    ol: [
      {
        a: {
          href: 'chapter1.xhtml',
          content: 'Chapter 1: Introduction',
        },
      },
      {
        a: {
          href: 'chapter2.xhtml',
          content: 'Chapter 2: Getting Started',
        },
        ol: [
          {
            a: {
              href: 'chapter2.xhtml#section-2-1',
              content: '2.1 Installation',
            },
          },
          {
            a: {
              href: 'chapter2.xhtml#section-2-2',
              content: '2.2 Configuration',
            },
          },
        ],
      },
      {
        span: {
          content: 'Appendices',
        },
        ol: [
          {
            a: {
              href: 'appendix-a.xhtml',
              content: 'Appendix A: References',
            },
          },
        ],
      },
    ],
  },

  // Optional: Page List
  pageList: {
    'epub:type': 'page-list',
    heading: {
      level: 2,
      content: 'Page List',
    },
    hidden: true, // Hide from spine rendering
    ol: [
      {
        a: {
          href: 'chapter1.xhtml#page-1',
          content: '1',
        },
      },
      {
        a: {
          href: 'chapter1.xhtml#page-2',
          content: '2',
        },
      },
    ],
  },

  // Optional: Landmarks
  landmarks: {
    'epub:type': 'landmarks',
    heading: {
      level: 2,
      content: 'Guide',
    },
    hidden: true,
    ol: [
      {
        a: {
          href: '#toc',
          content: 'Table of Contents',
          'epub:type': 'toc',
        },
      },
      {
        a: {
          href: 'chapter1.xhtml',
          content: 'Start of Content',
          'epub:type': 'bodymatter',
        },
      },
    ],
  },

  // Optional: Custom navigation
  customNavs: [
    {
      'epub:type': 'loi', // List of Illustrations
      heading: {
        level: 2,
        content: 'List of Illustrations',
      },
      ol: [
        {
          a: {
            href: 'chapter1.xhtml#fig-1',
            content: 'Figure 1: System Architecture',
          },
        },
      ],
    },
  ],
};
```

## Type Definitions

### Core Types

#### `EPUBNavigationDocument`

The main type representing a complete EPUB Navigation Document.

```typescript
interface EPUBNavigationDocument {
  metadata?: {
    title?: string;
    lang?: string;
    xmlns?: string;
    [key: string]: unknown;
  };
  toc: TocNav; // REQUIRED
  pageList?: PageListNav; // OPTIONAL
  landmarks?: LandmarksNav; // OPTIONAL
  customNavs?: CustomNav[]; // OPTIONAL
  additionalContent?: unknown;
}
```

#### `NavListItem`

Represents a list item in any navigation list.

```typescript
interface NavListItem {
  a?: {
    href: string;
    content: PhrasingContent;
    title?: string;
    'epub:type'?: string;
    [key: string]: unknown;
  };
  span?: {
    content: PhrasingContent;
    title?: string;
    [key: string]: unknown;
  };
  ol?: NavListItem[]; // Nested sublists
}
```

### Navigation Types

#### `TocNav`

Table of Contents navigation (required, exactly one).

```typescript
interface TocNav extends NavElement {
  'epub:type': 'toc';
}
```

#### `PageListNav`

Page list navigation (optional, at most one). Should be flat with no nested sublists.

```typescript
interface PageListNav extends NavElement {
  'epub:type': 'page-list';
  ol: Array<Omit<NavListItem, 'ol'>>;
}
```

#### `LandmarksNav`

Landmarks navigation (optional, at most one). Should be flat, and all links must have `epub:type`.

```typescript
interface LandmarksNav extends NavElement {
  'epub:type': 'landmarks';
  ol: Array<{
    a: {
      href: string;
      content: PhrasingContent;
      title?: string;
      'epub:type': string; // REQUIRED
      [key: string]: unknown;
    };
  }>;
}
```

#### `CustomNav`

Custom navigation elements (optional, any number).

```typescript
interface CustomNav extends NavElement {
  'epub:type': string; // Custom type like 'lot', 'loi', etc.
}
```

## Key Conformance Requirements

Based on the EPUB 3.3 specification:

1. **Required Elements**:
   - Exactly one `toc nav` element is required
   - Each `nav` element must have exactly one `ol` child

2. **List Item Structure**:
   - Each `li` must contain exactly one `a` or `span` element
   - `a` elements provide navigation links
   - `span` elements serve as headings for grouping (must have nested `ol`)

3. **Text Labels**:
   - All `a` and `span` elements must provide non-zero-length text labels
   - Labels can include `title` or `alt` attributes for non-textual content

4. **Link Targets**:
   - Links in `toc`, `page-list`, and `landmarks` must resolve to top-level content documents or fragments
   - Links in custom nav elements may reference external resources

5. **Landmarks**:
   - All `a` elements must have `epub:type` attribute
   - Must not include duplicate `epub:type` values referencing the same resource

6. **Optional Elements**:
   - At most one `page-list nav`
   - At most one `landmarks nav`
   - Any number of custom `nav` elements

## Examples

### Minimal Navigation Document

```typescript
const minimalNav: EPUBNavigationDocument = {
  toc: {
    'epub:type': 'toc',
    ol: [
      {
        a: {
          href: 'content.xhtml',
          content: 'Main Content',
        },
      },
    ],
  },
};
```

### Nested Table of Contents

```typescript
const nestedToc: TocNav = {
  'epub:type': 'toc',
  heading: {
    level: 1,
    content: 'Contents',
  },
  ol: [
    {
      a: {
        href: 'part1.xhtml',
        content: 'Part I: Foundations',
      },
      ol: [
        {
          a: {
            href: 'chapter1.xhtml',
            content: 'Chapter 1',
          },
          ol: [
            {
              a: {
                href: 'chapter1.xhtml#intro',
                content: 'Introduction',
              },
            },
            {
              a: {
                href: 'chapter1.xhtml#methods',
                content: 'Methods',
              },
            },
          ],
        },
      ],
    },
  ],
};
```

### Using Span for Grouping

```typescript
const groupedNav: TocNav = {
  'epub:type': 'toc',
  ol: [
    {
      span: {
        content: 'Front Matter',
      },
      ol: [
        {
          a: {
            href: 'preface.xhtml',
            content: 'Preface',
          },
        },
        {
          a: {
            href: 'acknowledgments.xhtml',
            content: 'Acknowledgments',
          },
        },
      ],
    },
  ],
};
```

### Hidden Navigation for Spine

```typescript
const hiddenPageList: PageListNav = {
  'epub:type': 'page-list',
  heading: {
    level: 2,
    content: 'Page List',
  },
  hidden: true, // Hide when document is in spine
  ol: [
    { a: { href: 'content.xhtml#page-1', content: 'i' } },
    { a: { href: 'content.xhtml#page-2', content: 'ii' } },
    { a: { href: 'content.xhtml#page-3', content: '1' } },
  ],
};
```

### Landmarks with Recommended Types

```typescript
import { TypedLandmarksNav, RecommendedLandmarkType } from './types';

const landmarks: TypedLandmarksNav = {
  'epub:type': 'landmarks',
  ol: [
    {
      a: {
        href: 'toc.xhtml',
        content: 'Table of Contents',
        'epub:type': 'toc',
      },
    },
    {
      a: {
        href: 'chapter1.xhtml',
        content: 'Start Reading',
        'epub:type': 'bodymatter',
      },
    },
    {
      a: {
        href: 'glossary.xhtml',
        content: 'Glossary',
        'epub:type': 'glossary',
      },
    },
  ],
};
```

## Specification References

- [EPUB 3.3 Specification - Section 7: EPUB Navigation Document](https://www.w3.org/TR/epub-33/#sec-nav)
- [EPUB 3 Structural Semantics Vocabulary](https://www.w3.org/TR/epub-ssv-11/)
- [HTML Standard - The nav element](https://html.spec.whatwg.org/multipage/sections.html#the-nav-element)

## License

BSD
