import { v4 as uuidV4 } from 'uuid';

import {
  Chapter,
  DublinCoreMetadata,
  ManifestItem,
  SpineItem,
} from '../base-epub/base-epub.types';
import { escapeXml } from '../utils/xml.utils';

import { NCXDocument, NCXNavPoint } from './epub2.types';

// ============================================================================
// EPUB 2 Specific Templates
// ============================================================================
/**
 * Generate XHTML 1.1 template for a chapter (EPUB 2)
 */

export function generateChapterXHTML(
  chapter: Chapter,
  stylesheetHrefs: string[] = [],
): string {
  const styleLinks = stylesheetHrefs
    .map((href) => `  <link rel="stylesheet" type="text/css" href="${href}"/>`)
    .join('\n');

  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" 
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>
  <title>${escapeXml(chapter.title)}</title>
${styleLinks}
</head>
<body>
  <div id="${chapter.id}">
    ${chapter.addTitleToContent ? `<h${chapter.headingLevel}>${escapeXml(chapter.title)}</h${chapter.headingLevel}>` : ''}
    ${chapter.content}
  </div>
</body>
</html>`;
}

/**
 * Generate the EPUB 2 Package Document (OPF 2.0)
 */
export function generateOPF(
  metadata: DublinCoreMetadata,
  manifestItems: ManifestItem[],
  spineItems: SpineItem[],
  ncxId: string,
): string {
  const identifier = metadata.identifier || uuidV4();
  const language = metadata.language || 'en';
  const date = metadata.date || new Date().toISOString().split('T')[0];

  // Generate metadata section for EPUB 2
  const metadataXml = generateMetadataSection(
    metadata,
    identifier,
    language,
    date,
  );

  // Generate manifest section
  const manifestXml = manifestItems
    .map((item) => {
      return `    <item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"/>`;
    })
    .join('\n');

  // Generate spine section with NCX reference
  const spineXml = spineItems
    .map((item) => {
      const linear = item.linear === false ? ' linear="no"' : '';
      return `    <itemref idref="${item.idref}"${linear}/>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="pub-id">
${metadataXml}
  <manifest>
${manifestXml}
  </manifest>
  <spine toc="${ncxId}">
${spineXml}
  </spine>
</package>`;
}

/**
 * Generate metadata section for OPF 2.0
 */
export function generateMetadataSection(
  metadata: DublinCoreMetadata,
  identifier: string,
  language: string,
  date: string,
): string {
  const {
    title,
    creator,
    publisher,
    description,
    subject,
    rights,
    contributor,
  } = metadata;

  let metadataXml = `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="pub-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(creator)}</dc:creator>
    <dc:language>${escapeXml(language)}</dc:language>
    <dc:date>${escapeXml(date)}</dc:date>`;

  if (publisher) {
    metadataXml += `\n    <dc:publisher>${escapeXml(publisher)}</dc:publisher>`;
  }

  if (description) {
    metadataXml += `\n    <dc:description>${escapeXml(description)}</dc:description>`;
  }

  if (subject) {
    const subjects = Array.isArray(subject) ? subject : [subject];
    subjects.forEach((s) => {
      metadataXml += `\n    <dc:subject>${escapeXml(s)}</dc:subject>`;
    });
  }

  if (rights) {
    metadataXml += `\n    <dc:rights>${escapeXml(rights)}</dc:rights>`;
  }

  if (contributor) {
    const contributors = Array.isArray(contributor)
      ? contributor
      : [contributor];
    contributors.forEach((c) => {
      metadataXml += `\n    <dc:contributor>${escapeXml(c)}</dc:contributor>`;
    });
  }

  metadataXml += '\n  </metadata>';

  return metadataXml;
}
/**
 * Generate NCX (Navigation Control file for XML) - EPUB 2
 */

export function generateNCX(ncxDoc: NCXDocument): string {
  const { uid, docTitle, docAuthor, navMap } = ncxDoc;

  let ncxXml = `<?xml version='1.0' encoding='utf-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="en">
  <head>
    <meta name="dtb:uid" content="${escapeXml(uid)}"/>
    <meta name="dtb:depth" content="${calculateNavMapDepth(navMap)}"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(docTitle)}</text>
  </docTitle>`;

  if (docAuthor) {
    ncxXml += `\n  <docAuthor>
    <text>${escapeXml(docAuthor)}</text>
  </docAuthor>`;
  }

  ncxXml += '\n  <navMap>';
  ncxXml += generateNavPoints(navMap, 2);
  ncxXml += '\n  </navMap>';

  // TODO: Add support for pageList and navList
  // if (ncxDoc.pageList) {
  //   ncxXml += '\n  <pageList>';
  //   ncxXml += generatePageList(ncxDoc.pageList, 2);
  //   ncxXml += '\n  </pageList>';
  // }
  // if (ncxDoc.navList) {
  //   ncxXml += '\n  <navList>';
  //   ncxXml += generateNavList(ncxDoc.navList, 2);
  //   ncxXml += '\n  </navList>';
  // }
  ncxXml += '\n</ncx>';

  return ncxXml;
}
/**
 * Generate navPoint elements recursively
 */
function generateNavPoints(navPoints: NCXNavPoint[], indent: number): string {
  const indentStr = '  '.repeat(indent);
  let xml = '';

  navPoints.forEach((navPoint) => {
    xml += `\n${indentStr}<navPoint id="${navPoint.id}">`;
    xml += `\n${indentStr}  <navLabel>`;
    xml += `\n${indentStr}    <text>${escapeXml(navPoint.navLabel)}</text>`;
    xml += `\n${indentStr}  </navLabel>`;
    xml += `\n${indentStr}  <content src="${escapeXml(navPoint.content)}"/>`;

    if (navPoint.children && navPoint.children.length > 0) {
      xml += generateNavPoints(navPoint.children, indent + 1);
    }

    xml += `\n${indentStr}</navPoint>`;
  });

  return xml;
}
/**
 * Calculate the maximum depth of the navMap
 */
function calculateNavMapDepth(navPoints: NCXNavPoint[]): number {
  let maxDepth = 1;

  function traverse(points: NCXNavPoint[], currentDepth: number): void {
    points.forEach((point) => {
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
      if (point.children && point.children.length > 0) {
        traverse(point.children, currentDepth + 1);
      }
    });
  }

  traverse(navPoints, 1);
  return maxDepth;
}
