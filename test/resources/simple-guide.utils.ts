import { EPUB2Builder, EPUB3Builder } from '../../src';

export function createSimpleBook(
  EPUBBuilder: typeof EPUB2Builder | typeof EPUB3Builder,
): EPUB2Builder | EPUB3Builder {
  const epub = new EPUBBuilder({
    title: 'A Simple Guide',
    creator: 'Example Author',
    language: 'en',
    publisher: 'Example Press',
    description: 'A simple example book created with EPUBBuilder',
  });

  epub.addChapter({
    title: 'Introduction',
    content: `
      <p>Welcome to this simple guide!</p>
      <p>This book demonstrates the EPUBBuilder library.</p>
    `,
  });

  const part1 = epub.addChapter({
    title: 'Part I: Basics',
    content: "<p>Let's start with the fundamentals.</p>",
  });

  epub.addChapter({
    title: 'Chapter 1: Getting Started',
    parentId: part1,
    content: `
      <p>This is the first chapter.</p>
      <p>It contains some introductory information.</p>
      <h2>A Subsection</h2>
      <p>Here's some more detailed content.</p>
    `,
  });

  epub.addChapter({
    title: 'Chapter 2: Advanced Topics',
    parentId: part1,
    content: `
      <p>Now let's explore more advanced concepts.</p>
      <ul>
        <li>First concept</li>
        <li>Second concept</li>
        <li>Third concept</li>
      </ul>
    `,
  });

  const part2 = epub.addChapter({
    title: 'Part II: Practical Examples',
    content: '<p>Here are some practical examples.</p>',
  });

  epub.addChapter({
    title: 'Chapter 3: Real-World Applications',
    parentId: part2,
    content: `
      <p>Let's see how this works in practice.</p>
      <blockquote>
        "Examples are always better than theory." - Anonymous
      </blockquote>
    `,
  });

  epub.addChapter({
    title: 'Conclusion',
    content: `
      <p>Thank you for reading this guide!</p>
      <p>We hope you found it useful.</p>
    `,
  });

  return epub;
}
