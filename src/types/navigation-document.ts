/**
 * TypeScript types for EPUB 3.3 Navigation Document
 * Based on EPUB 3.3 specification, Section 7
 * @see https://www.w3.org/TR/epub-33/#sec-nav
 */

/**
 * Represents a navigation link or heading in a navigation list
 */
export interface NavLink {
  /**
   * Link element with href pointing to a content document or fragment
   * Required for actual navigation targets (toc, page-list, landmarks)
   */
  a?: {
    /** URL reference to a top-level content document or fragment */
    href: string;
    /** Text label for the link (non-zero-length after whitespace normalization) */
    content: string;
    /** Optional title attribute for alternate text rendering */
    title?: string;
    /** epub:type attribute (required for landmarks nav) */
    'epub:type'?: string;
    /** Any other HTML attributes */
    [key: string]: unknown;
  };

  /**
   * Span element used as a heading for grouping lists
   * Cannot occur in "leaf" list items (must have a nested ol)
   */
  span?: {
    /** Text label for the heading (non-zero-length after whitespace normalization) */
    content: string;
    /** Optional title attribute for alternate text rendering */
    title?: string;
    /** Any other HTML attributes */
    [key: string]: unknown;
  };
}

/**
 * Represents a list item in a navigation list
 */
export interface NavListItem extends NavLink {
  /**
   * Optional nested ordered list for subsidiary content levels
   * - MUST follow an 'a' element (optional for 'a')
   * - MUST follow a 'span' element (required for 'span')
   */
  ol?: NavListItem[];
}

/**
 * Base structure for all nav elements in EPUB Navigation Document
 */
export interface NavElement {
  /**
   * epub:type attribute identifying the navigation type
   * Required for reading system processing
   */
  'epub:type': string;

  /**
   * Optional heading element (h1-h6)
   */
  heading?: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    content: string;
    /** Optional id attribute for aria-labelledby */
    id?: string;
    /** Any other HTML attributes */
    [key: string]: unknown;
  };

  /**
   * Ordered list representing the primary level of content navigation
   * Exactly one ol element is required
   */
  ol: NavListItem[];

  /**
   * HTML hidden attribute to exclude from rendering in spine
   * Has no effect on reading system navigation interfaces
   */
  hidden?: boolean;

  /**
   * Optional aria-labelledby attribute for accessibility
   */
  'aria-labelledby'?: string;

  /** Any other HTML attributes */
  [key: string]: unknown;
}

/**
 * Table of Contents navigation element
 * REQUIRED - exactly one per navigation document
 * Defines the primary navigational hierarchy
 */
export interface TocNav extends NavElement {
  'epub:type': 'toc';
}

/**
 * Page List navigation element
 * OPTIONAL - at most one per navigation document
 * Provides navigation to static page boundaries
 * Should contain only a single ol descendant (no nested sublists)
 */
export interface PageListNav extends NavElement {
  'epub:type': 'page-list';
  /**
   * Page list should be flat (no nested sublists)
   */
  ol: Array<Omit<NavListItem, 'ol'>>;
}

/**
 * Landmarks navigation element
 * OPTIONAL - at most one per navigation document
 * Identifies fundamental structural components for efficient access
 * Should contain only a single ol descendant (no nested sublists)
 */
export interface LandmarksNav extends NavElement {
  'epub:type': 'landmarks';
  /**
   * Landmarks list should be flat (no nested sublists)
   * All 'a' elements MUST have epub:type attribute
   * MUST NOT include multiple entries with the same epub:type value
   * that reference the same resource or fragment
   */
  ol: Array<{
    /** Link element is required for landmarks */
    a: {
      href: string;
      content: string;
      title?: string;
      /** epub:type is REQUIRED for landmarks */
      'epub:type': string;
      [key: string]: unknown;
    };
  }>;
}

/**
 * Custom navigation element
 * OPTIONAL - any number allowed
 * Can represent any information domain navigation
 */
export interface CustomNav extends NavElement {
  /**
   * Custom epub:type value (not 'toc', 'page-list', or 'landmarks')
   * Examples: 'lot' (list of tables), 'loi' (list of illustrations), etc.
   */
  'epub:type': string;
}

/**
 * EPUB Navigation Document
 * A specialized XHTML content document that defines navigation for an EPUB publication
 *
 * Conformance Requirements:
 * - MUST conform to XHTML content document constraints
 * - MUST include exactly one toc nav element
 * - MAY include at most one page-list nav element
 * - MAY include at most one landmarks nav element
 * - MAY include any number of custom nav elements
 *
 * @see https://www.w3.org/TR/epub-33/#sec-nav
 */
export interface EPUBNavigationDocument {
  /**
   * Document metadata
   */
  metadata?: {
    /** Document title */
    title?: string;
    /** Document language */
    lang?: string;
    /** XML namespace */
    xmlns?: string;
    [key: string]: unknown;
  };

  /**
   * Table of Contents - REQUIRED
   * Exactly one toc nav element must be present
   */
  toc: TocNav;

  /**
   * Page List - OPTIONAL
   * At most one page-list nav element
   */
  pageList?: PageListNav;

  /**
   * Landmarks - OPTIONAL
   * At most one landmarks nav element
   */
  landmarks?: LandmarksNav;

  /**
   * Custom navigation elements - OPTIONAL
   * Any number of additional nav elements with custom epub:type values
   */
  customNavs?: CustomNav[];

  /**
   * Additional content outside nav elements
   * The navigation document can include other XHTML content
   */
  additionalContent?: unknown;
}

/**
 * Recommended landmark types from EPUB 3 Structural Semantics Vocabulary
 * @see https://www.w3.org/TR/epub-ssv-11/
 */
export type RecommendedLandmarkType =
  | 'toc' // Table of Contents
  | 'bodymatter' // Start of main content
  | 'loi' // List of Illustrations
  | 'lot' // List of Tables
  | 'preface' // Preface
  | 'bibliography' // Bibliography
  | 'index' // Index
  | 'glossary'; // Glossary

/**
 * Helper type for creating a landmarks nav with recommended types
 */
export interface TypedLandmarksNav extends Omit<LandmarksNav, 'ol'> {
  ol: Array<{
    a: {
      href: string;
      content: string;
      title?: string;
      'epub:type': RecommendedLandmarkType | string;
      [key: string]: unknown;
    };
  }>;
}
