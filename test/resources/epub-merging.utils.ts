import * as path from 'node:path';

import { EPUB2Builder, EPUB3Builder } from '../../src';
import { TEMP_DIR } from '../epub-merging.test';

/**
 * Helper function to create a simple test EPUB
 */
export async function createTestEPUB(
  EPUBBuilder: typeof EPUB2Builder | typeof EPUB3Builder,
  options: {
    filename: string;
    title: string;
    creator: string;
    chapters: Array<{ title: string; content: string }>;
    images?: Array<{ filename: string; data: Buffer; alt: string }>;
    stylesheets?: Array<{ filename: string; content: string }>;
  },
): Promise<string> {
  const epub = new EPUBBuilder({
    title: options.title,
    creator: options.creator,
    language: 'en',
  });

  // Add chapters
  for (const chapter of options.chapters) {
    epub.addChapter({
      title: chapter.title,
      content: chapter.content,
    });
  }

  // Add images if provided
  if (options.images) {
    for (const image of options.images) {
      epub.addImage(image);
    }
  }

  // Add stylesheets if provided
  if (options.stylesheets) {
    for (const stylesheet of options.stylesheets) {
      epub.addStylesheet(stylesheet);
    }
  }

  const outputPath = path.join(TEMP_DIR, options.filename);
  await epub.exportToFile(outputPath);

  return outputPath;
}
