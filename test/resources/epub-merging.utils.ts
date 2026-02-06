import * as path from 'node:path';

import { EPUB2Builder, EPUB3Builder } from '../../src';
import { TEMP_DIR } from '../epub-merging.test';

type SimpleChapter = {
  title: string;
  content: string;
  children?: SimpleChapter[];
};

function addAllChapters(
  epub: EPUB2Builder | EPUB3Builder,
  chapters: Array<SimpleChapter>,
  parentId?: string,
) {
  for (const chapter of chapters) {
    const chapterId = epub.addChapter({
      title: chapter.title,
      content: chapter.content,
      parentId,
    });
    if (chapter.children && chapter.children.length > 0) {
      addAllChapters(epub, chapter.children, chapterId);
    }
  }
}

/**
 * Helper function to create a simple test EPUB
 */
export function getTestEpub(
  EPUBBuilder: typeof EPUB2Builder | typeof EPUB3Builder,
  options: {
    filename: string;
    title: string;
    creator: string;
    chapters: Array<SimpleChapter>;
    images?: Array<{ filename: string; data: Buffer; alt: string }>;
    stylesheets?: Array<{ filename: string; content: string }>;
  },
): EPUB2Builder | EPUB3Builder {
  const epub = new EPUBBuilder({
    title: options.title,
    creator: options.creator,
    language: 'en',
  });

  // Add chapters
  addAllChapters(epub, options.chapters);

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
  return epub;
}

export async function createTestEPUB(
  EPUBBuilder: typeof EPUB2Builder | typeof EPUB3Builder,
  options: {
    filename: string;
    title: string;
    creator: string;
    chapters: Array<SimpleChapter>;
    images?: Array<{ filename: string; data: Buffer; alt: string }>;
    stylesheets?: Array<{ filename: string; content: string }>;
  },
): Promise<string> {
  const epub = getTestEpub(EPUBBuilder, options);

  const outputPath = path.join(TEMP_DIR, options.filename);
  await epub.exportToFile(outputPath);

  return outputPath;
}
