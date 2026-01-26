/**
 * EPUB 3 specific types
 */

/**
 * Navigation document types for EPUB 3
 */
export interface TocNav {
  'epub:type': 'toc';
  heading: {
    level: number;
    content: string;
    id: string;
  };
  ol: NavListItem[];
}

export interface NavListItem {
  a: {
    href: string;
    content: string;
  };
  ol?: NavListItem[];
}

export interface EPUBNavigationDocument {
  metadata: {
    title: string;
    lang: string;
  };
  toc: TocNav;
}
