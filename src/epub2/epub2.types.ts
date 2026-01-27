/**
 * EPUB 2 specific types
 */

/**
 * NCX Navigation Map item
 */
export interface NCXNavPoint {
  id: string;
  navLabel: string;
  content: string;
  children?: NCXNavPoint[];
}

/**
 * NCX Navigation Document structure
 */
export interface NCXDocument {
  uid: string;
  docTitle: string;
  docAuthor?: string;
  navMap: NCXNavPoint[];
  // TODO: Add support for pageList and navList
  // pageList?: NCXPageTarget[];
  // navList?: NCXNavList[];
}
