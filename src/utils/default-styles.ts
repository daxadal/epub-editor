/**
 * Default CSS stylesheet for EPUB content
 */

export const DEFAULT_CSS = `/* EPUB 3.3 Default Stylesheet */

/* Base Styles */
body {
  font-family: Georgia, serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1em;
  padding: 0;
  color: #333;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.2;
  color: #000;
}

h1 {
  font-size: 2em;
  margin-top: 1em;
}

h2 {
  font-size: 1.5em;
}

h3 {
  font-size: 1.25em;
}

h4 {
  font-size: 1.1em;
}

h5 {
  font-size: 1em;
}

h6 {
  font-size: 0.9em;
}

/* Paragraphs */
p {
  margin: 0 0 1em 0;
  text-align: justify;
  text-indent: 0;
}

p + p {
  text-indent: 1.5em;
}

/* Links */
a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Lists */
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.5em 0;
}

/* Blockquotes */
blockquote {
  margin: 1em 2em;
  padding: 0.5em 1em;
  border-left: 3px solid #ccc;
  font-style: italic;
}

/* Code */
code {
  font-family: "Courier New", Courier, monospace;
  background-color: #f5f5f5;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  font-family: "Courier New", Courier, monospace;
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

pre code {
  background-color: transparent;
  padding: 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

figure {
  margin: 1em 0;
  text-align: center;
}

figcaption {
  font-size: 0.9em;
  font-style: italic;
  margin-top: 0.5em;
  color: #666;
}

/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

/* Sections */
section {
  margin-bottom: 2em;
}

/* Horizontal Rule */
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}

/* Strong and Emphasis */
strong, b {
  font-weight: bold;
}

em, i {
  font-style: italic;
}

/* Small and Subscript/Superscript */
small {
  font-size: 0.85em;
}

sub, sup {
  font-size: 0.75em;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sup {
  top: -0.5em;
}

sub {
  bottom: -0.25em;
}

/* Page Breaks */
.page-break {
  page-break-after: always;
  break-after: page;
}

/* Navigation */
nav {
  margin: 2em 0;
}

nav ol {
  list-style-type: none;
  padding-left: 0;
}

nav ol ol {
  padding-left: 1.5em;
}

nav li {
  margin: 0.3em 0;
}

nav a {
  color: #0066cc;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}

/* Accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`;
