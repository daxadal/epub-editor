import { EPUB2Builder, EPUB3Builder } from '../../src';

export function editExistingEPUB(
  epub: EPUB2Builder | EPUB3Builder,
): EPUB2Builder | EPUB3Builder {
  // Add a new chapter
  epub.addChapter({
    title: 'Bonus Chapter: Additional Content',
    content: `
        <p>This is a bonus chapter added by the EPUBBuilder library!</p>
        <p>This demonstrates how you can load an existing EPUB and add new content.</p>
        <h2>What You Can Do</h2>
        <ul>
          <li>Add new chapters</li>
          <li>Modify existing chapters</li>
          <li>Update metadata</li>
          <li>Add images</li>
          <li>Add custom styles</li>
        </ul>
        <p>The navigation document will be automatically updated to include this chapter.</p>
      `,
  });

  // Append to an existing chapter
  const chapters = epub.getRootChapters();
  epub.appendToChapter(
    chapters[0].id,
    `
        <hr/>
        <p><em>Note: This content was appended using EPUBBuilder.</em></p>
      `,
  );

  // Update metadata
  const metadata = epub.getMetadata();

  epub.setMetadata({
    description:
      `${metadata.description || ''} Modified with EPUBBuilder.`.trim(),
  });

  return epub;
}
