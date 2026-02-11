/* eslint-disable security/detect-non-literal-regexp */

import * as path from 'node:path';

import { Replacement } from './base-epub.types';

function getSingleReplacement(oldPath: string, newPath: string): Replacement[] {
  // Handle various possible path formats
  const patterns = [
    new RegExp(String.raw`src=["']\.\./${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']${oldPath}["']`, 'g'),
    new RegExp(String.raw`src=["']\.\./${path.basename(oldPath)}["']`, 'g'),
    new RegExp(String.raw`src=["']${path.basename(oldPath)}["']`, 'g'),
  ];

  const replacement = `src="../${newPath}"`;

  return patterns.map((pattern) => ({ pattern, replacement }));
}

export function getAllReplacements(
  stylesheetMap: Map<string, string>,
  imageMap: Map<string, string>,
): Replacement[] {
  const allReplacements: Replacement[] = [];
  stylesheetMap.forEach((newFilename, oldFilename) => {
    const replacements = getSingleReplacement(
      oldFilename,
      `styles/${newFilename}`,
    );
    allReplacements.push(...replacements);
  });

  // Update image references in content
  imageMap.forEach((newFilename, oldFilename) => {
    const replacements = getSingleReplacement(
      oldFilename,
      `images/${newFilename}`,
    );
    allReplacements.push(...replacements);
  });

  return allReplacements;
}
