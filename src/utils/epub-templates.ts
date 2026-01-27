/**
 * EPUB 3.3 Templates and Document Generators
 */
import { v4 as uuidV4 } from 'uuid';

import {
  DublinCoreMetadata,
  Chapter,
  ManifestItem,
  SpineItem,
} from '../types/epub-builder-types';
import {
  EPUBNavigationDocument,
  NavListItem,
} from '../types/navigation-document';

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
