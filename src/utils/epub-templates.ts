/**
 * EPUB 2 and EPUB 3 Templates and Document Generators
 */
import { v4 as uuidV4 } from 'uuid';

import {
  DublinCoreMetadata,
  Chapter,
  ManifestItem,
  SpineItem,
} from '../types/base-epub-types';
import {
  EPUBNavigationDocument,
  NavListItem,
} from '../types/navigation-document';
import { NCXDocument, NCXNavPoint } from '../types/epub2-types';

/**
 * Generate the mimetype file content
 */
export function generateMimetype(): string {
  return 'application/epub+zip';
}

/**
 * Generate the META-INF/container.xml file
 */
export function generateContainer(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

/**
 * Generate XHTML template for a chapter
 */
export function generateChapterXHTML(
  chapter: Chapter,
  stylesheetHrefs: string[] = [],
): string {
  const styleLinks = stylesheetHrefs
    .map((href) => `  <link rel="stylesheet" type="text/css" href="${href}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chapter.title)}</title>
${styleLinks}
</head>
<body>
  <section id="${chapter.id}" epub:type="chapter">
    <h${chapter.headingLevel || 1}>${escapeXml(chapter.title)}</h${chapter.headingLevel || 1}>
    ${chapter.content}
  </section>
</body>
</html>`;
}

/**
 * Generate the EPUB Package Document (OPF)
 */
export function generateOPF(
  metadata: DublinCoreMetadata,
  manifestItems: ManifestItem[],
  spineItems: SpineItem[],
): string {
  const identifier = metadata.identifier || uuidV4();
  const language = metadata.language || 'en';
  const date = metadata.date || new Date().toISOString().split('T')[0];

  // Generate metadata section
  const metadataXml = generateMetadataSection(
    metadata,
    identifier,
    language,
    date,
  );

  // Generate manifest section
  const manifestXml = manifestItems
    .map((item) => {
      const props = item.properties ? ` properties="${item.properties}"` : '';
      return `    <item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${props}/>`;
    })
    .join('\n');

  // Generate spine section
  const spineXml = spineItems
    .map((item) => {
      const linear = item.linear === false ? ' linear="no"' : '';
      const props = item.properties ? ` properties="${item.properties}"` : '';
      return `    <itemref idref="${item.idref}"${linear}${props}/>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="${language}" unique-identifier="pub-id">
${metadataXml}
  <manifest>
${manifestXml}
  </manifest>
  <spine>
${spineXml}
  </spine>
</package>`;
}

/**
 * Generate metadata section for OPF
 */
function generateMetadataSection(
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
    type,
    format,
    source,
    relation,
    coverage,
  } = metadata;

  let metadataXml = `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(creator)}</dc:creator>
    <dc:language>${escapeXml(language)}</dc:language>
    <dc:date>${escapeXml(date)}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>`;

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

  if (type) {
    metadataXml += `\n    <dc:type>${escapeXml(type)}</dc:type>`;
  }

  if (format) {
    metadataXml += `\n    <dc:format>${escapeXml(format)}</dc:format>`;
  }

  if (source) {
    metadataXml += `\n    <dc:source>${escapeXml(source)}</dc:source>`;
  }

  if (relation) {
    metadataXml += `\n    <dc:relation>${escapeXml(relation)}</dc:relation>`;
  }

  if (coverage) {
    metadataXml += `\n    <dc:coverage>${escapeXml(coverage)}</dc:coverage>`;
  }

  metadataXml += '\n  </metadata>';

  return metadataXml;
}

/**
 * Generate Navigation Document (nav.xhtml)
 */
export function generateNavigationDocument(
  navDoc: EPUBNavigationDocument,
  stylesheetHrefs: string[] = [],
): string {
  const styleLinks = stylesheetHrefs
    .map((href) => `  <link rel="stylesheet" type="text/css" href="${href}"/>`)
    .join('\n');

  const title = navDoc.metadata?.title || 'Navigation';
  const lang = navDoc.metadata?.lang || 'en';

  let bodyContent = '';

  // Generate TOC nav
  bodyContent += generateNavElement(navDoc.toc);

  // Generate page-list nav if present
  if (navDoc.pageList) {
    bodyContent += '\n' + generateNavElement(navDoc.pageList);
  }

  // Generate landmarks nav if present
  if (navDoc.landmarks) {
    bodyContent += '\n' + generateNavElement(navDoc.landmarks);
  }

  // Generate custom navs if present
  if (navDoc.customNavs && navDoc.customNavs.length > 0) {
    navDoc.customNavs.forEach((customNav) => {
      bodyContent += '\n' + generateNavElement(customNav);
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
${styleLinks}
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Generate a single nav element
 */
function generateNavElement(navElement: any): string {
  const epubType = navElement['epub:type'];
  const hidden = navElement.hidden ? ' hidden="hidden"' : '';
  const ariaLabel = navElement['aria-labelledby']
    ? ` aria-labelledby="${navElement['aria-labelledby']}"`
    : '';

  let navXml = `  <nav epub:type="${epubType}"${hidden}${ariaLabel}>`;

  // Add heading if present
  if (navElement.heading) {
    const level = navElement.heading.level || 2;
    const id = navElement.heading.id ? ` id="${navElement.heading.id}"` : '';
    navXml += `\n    <h${level}${id}>${escapeXml(navElement.heading.content)}</h${level}>`;
  }

  // Generate ordered list
  navXml += '\n' + generateNavList(navElement.ol, 2);

  navXml += '\n  </nav>';

  return navXml;
}

/**
 * Generate ordered list for nav element
 */
function generateNavList(items: NavListItem[], indent: number): string {
  const indentStr = '  '.repeat(indent);
  let xml = `${indentStr}<ol>`;

  items.forEach((item) => {
    xml += `\n${indentStr}  <li>`;

    if (item.a) {
      const href = item.a.href;
      const content = item.a.content;
      const epubType = item.a['epub:type']
        ? ` epub:type="${item.a['epub:type']}"`
        : '';
      const title = item.a.title ? ` title="${escapeXml(item.a.title)}"` : '';
      xml += `\n${indentStr}    <a href="${escapeXml(href)}"${epubType}${title}>${escapeXml(content)}</a>`;
    } else if (item.span) {
      const content = item.span.content;
      const title = item.span.title
        ? ` title="${escapeXml(item.span.title)}"`
        : '';
      xml += `\n${indentStr}    <span${title}>${escapeXml(content)}</span>`;
    }

    if (item.ol && item.ol.length > 0) {
      xml += '\n' + generateNavList(item.ol, indent + 2);
    }

    xml += `\n${indentStr}  </li>`;
  });

  xml += `\n${indentStr}</ol>`;

  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// ============================================================================
// EPUB 2 Specific Templates
// ============================================================================

/**
 * Generate XHTML 1.1 template for a chapter (EPUB 2)
 */
export function generateChapterXHTML_EPUB2(
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
    <h${chapter.headingLevel || 1}>${escapeXml(chapter.title)}</h${chapter.headingLevel || 1}>
    ${chapter.content}
  </div>
</body>
</html>`;
}

/**
 * Generate the EPUB 2 Package Document (OPF 2.0)
 */
export function generateOPF_EPUB2(
  metadata: DublinCoreMetadata,
  manifestItems: ManifestItem[],
  spineItems: SpineItem[],
  ncxId: string,
): string {
  const identifier = metadata.identifier || uuidV4();
  const language = metadata.language || 'en';
  const date = metadata.date || new Date().toISOString().split('T')[0];

  // Generate metadata section for EPUB 2
  const metadataXml = generateMetadataSection_EPUB2(
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
function generateMetadataSection_EPUB2(
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
