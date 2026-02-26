# Testing Documentation

Comprehensive test suite for the epub-editor-ts library, covering EPUB 2 and EPUB 3 creation, parsing, editing, merging, and validation.

## Overview

The test suite provides end-to-end testing for all major functionality of the library, ensuring both EPUB 2.0.1 and EPUB 3.3 compliance.

**Test Statistics:**
- **87+ tests** across 5 test suites
- **Parameterized testing** for both EPUB 2 and EPUB 3
- **Reference file comparisons** for output quality
- **100% coverage** of public API methods

## Test Structure

```
test/
├── epub-creation.test.ts    # Creating EPUBs from scratch
├── epub-parsing.test.ts     # Parsing existing EPUB files
├── epub-editing.test.ts     # Editing/modifying EPUBs
├── epub-merging.test.ts     # Merging multiple EPUBs
├── validation.test.ts       # EPUB validation logic
└── resources/               # Test fixtures and utilities
    ├── simple-guide-2.epub       # Reference EPUB 2 file
    ├── simple-guide-3.epub       # Reference EPUB 3 file
    └── *.utils.ts                # Test helper functions
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all test suites sequentially (using `--runInBand` to avoid file conflicts).

### Run Specific Test Suite

```bash
# Creation tests
npm test epub-creation.test.ts

# Parsing tests
npm test epub-parsing.test.ts

# Editing tests
npm test epub-editing.test.ts

# Merging tests
npm test epub-merging.test.ts

# Validation tests
npm test validation.test.ts
```

### Watch Mode

```bash
npm test -- --watch
```

### With Coverage

```bash
npm test -- --coverage
```

---

## Test Suites

### 1. EPUB Creation Tests

**File:** `test/epub-creation.test.ts`

**Coverage:**
- ✅ Basic EPUB creation with minimal metadata
- ✅ EPUB creation with full metadata
- ✅ Single and multiple chapters
- ✅ Nested chapter hierarchies
- ✅ HTML content in chapters
- ✅ Adding images (cover and content images)
- ✅ Adding custom stylesheets
- ✅ Export to file and buffer
- ✅ Complete book creation workflow
- ✅ Validation of created EPUBs
- ✅ **Reference file comparison** (against pre-generated EPUBs)

**Parameterization:**
Tests run for both EPUB 2 and EPUB 3 using `describe.each`:

```typescript
describe.each([
  { version: 2, EPUBBuilder: EPUB2Builder, SIMPLE_GUIDE_PATH: SIMPLE_GUIDE_2_PATH },
  { version: 3, EPUBBuilder: EPUB3Builder, SIMPLE_GUIDE_PATH: SIMPLE_GUIDE_3_PATH },
])('EPUB $version Creation', ({ EPUBBuilder }) => {
  // Tests run for both versions
});
```

**Key Tests:**
- Creating EPUBs with nested chapter structures (Parts → Chapters → Sections)
- Binary file comparison with reference EPUBs
- Metadata preservation
- Resource management (images, stylesheets)

---

### 2. EPUB Parsing Tests

**File:** `test/epub-parsing.test.ts`

**Coverage:**
- ✅ Parse existing EPUB files (both formats)
- ✅ Extract metadata correctly
- ✅ Extract chapter structure
- ✅ Extract images and stylesheets
- ✅ Handle nested chapter hierarchies
- ✅ Parse from file and buffer
- ✅ Error handling for invalid files
- ✅ Title extraction strategies (HEAD, NAV, CONTENT)

**Key Tests:**
- Parsing reference EPUB files
- Verifying metadata extraction
- Verifying chapter count and structure
- Verifying resource extraction

**Reference Files:**
- `test/resources/simple-guide-2.epub` - EPUB 2 reference
- `test/resources/simple-guide-3.epub` - EPUB 3 reference

---

### 3. EPUB Editing Tests

**File:** `test/epub-editing.test.ts`

**Coverage:**
- ✅ Parse and re-export EPUBs
- ✅ Add new chapters to existing EPUBs
- ✅ Modify chapter content
- ✅ Append content to chapters
- ✅ Update metadata
- ✅ Add images to parsed EPUBs
- ✅ Add stylesheets to parsed EPUBs
- ✅ Preserve existing structure
- ✅ **Reference file comparison** (modified EPUBs)

**Key Tests:**
- Round-trip parsing and export (parse → modify → export → compare)
- Content modification preservation
- Metadata updates
- Binary comparison of edited EPUBs

---

### 4. EPUB Merging Tests

**File:** `test/epub-merging.test.ts`

**Coverage:**
- ✅ Merge two EPUBs
- ✅ Merge three or more EPUBs
- ✅ Merge EPUBs with nested structures
- ✅ Handle duplicate images (deduplication)
- ✅ Handle duplicate stylesheets
- ✅ Preserve chapter hierarchies
- ✅ Merge metadata from multiple sources
- ✅ Custom section naming
- ✅ Nested merging (EPUBs within sections)

**Key Tests:**
- Basic two-book merge
- Trilogy merge (3+ books)
- Image deduplication by content hash
- Stylesheet deduplication
- Hierarchical merging (books → chapters → sections)

**Example Test Pattern:**
```typescript
it('Two EPUBs are merged with all chapters preserved', async () => {
  const epub1 = createTestEPUB(EPUBBuilder, { /* ... */ });
  const epub2 = createTestEPUB(EPUBBuilder, { /* ... */ });
  
  const merged = new EPUBBuilder({ /* ... */ });
  merged.addEpubAsChapter({ title: 'Book 1' }, epub1);
  merged.addEpubAsChapter({ title: 'Book 2' }, epub2);
  
  const validation = merged.validate();
  expect(validation.isValid).toBe(true);
  
  const rootChapters = merged.getRootChapters();
  expect(rootChapters).toHaveLength(2);
});
```

---

### 5. Validation Tests

**File:** `test/validation.test.ts`

**Coverage:**
- ✅ Validate required metadata
- ✅ Validate chapter structure
- ✅ Validate parent-child relationships
- ✅ Validate resource references
- ✅ Detect missing metadata
- ✅ Detect invalid chapter IDs
- ✅ Complex EPUB validation

**Key Tests:**
- Metadata validation (title, language, identifier)
- Chapter structure validation
- Hierarchical validation

---

## Test Utilities

### Reference EPUB Files

#### `test/resources/simple-guide-2.epub`

**Format:** EPUB 2.0.1

**Description:** A complete, valid EPUB 2 file created by the library containing:
- Multiple chapters with nested structure
- Two parts (Part I and Part II) with sub-chapters
- Valid EPUB 2 metadata
- NCX navigation (toc.ncx)
- Package document (OPF 2.0)

**Used in:** Parsing and editing tests for EPUB 2

#### `test/resources/simple-guide-3.epub`

**Format:** EPUB 3.3

**Description:** A complete, valid EPUB 3 file created by the library containing:
- Multiple chapters with nested structure
- Two parts (Part I and Part II) with sub-chapters
- Valid EPUB 3.3 metadata
- XHTML5 navigation document (nav.xhtml)
- Package document (OPF 3.0)

**Used in:** Parsing and editing tests for EPUB 3

#### Regenerating Reference Files

If you need to regenerate the reference EPUB files:

```bash
# Generate EPUB 3
npx ts-node examples/simple-example.ts
cp examples/simple-guide-3.epub test/resources/

# Generate EPUB 2
npx ts-node examples/simple-example.ts --epub2
cp examples/simple-guide-2.epub test/resources/
```

---

### Test Helper Functions

#### `test/resources/simple-guide.utils.ts`

Provides helper functions for creating test EPUBs:

```typescript
export function createSimpleBook(EPUBBuilder: any): any {
  // Creates a standardized test EPUB with nested chapters
}
```

#### `test/resources/epub-merging.utils.ts`

Provides helper functions for merging tests:

```typescript
export function createTestEPUB(
  EPUBBuilder: any,
  options: { title, creator, chapters, images?, stylesheets? }
): any {
  // Creates customizable test EPUBs for merging
}
```

#### `test/resources/uuid.mock.ts`

Provides UUID mocking for deterministic tests:

```typescript
export class UUIDMock {
  static setupSequence(): void {
    // Mocks uuid.v4() to return predictable IDs
  }
}
```

---

## Test Configuration

### Jest Configuration

**File:** `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 10000,  // Allows time for EPUB file operations
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',  // Handle uuid ESM module
  ],
  reporters: [
    'default',
    'jest-junit',  // JUnit XML output for CI
  ],
};
```

**Key Settings:**
- `testTimeout: 10000` - Adequate time for file I/O operations
- `testEnvironment: "node"` - Node.js environment for file system access
- `--runInBand` flag - Runs tests sequentially to avoid file conflicts

### Test Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "test": "jest --runInBand"
  }
}
```

---

## Parameterized Testing

Tests use `describe.each` to run the same test suite for both EPUB 2 and EPUB 3:

```typescript
describe.each([
  { version: 2, EPUBBuilder: EPUB2Builder },
  { version: 3, EPUBBuilder: EPUB3Builder },
])('EPUB $version Merging', ({ version, EPUBBuilder }) => {
  it('merges two EPUBs', () => {
    const epub = new EPUBBuilder(/* ... */);
    // Test implementation works for both versions
  });
});
```

**Benefits:**
- Ensures both EPUB 2 and EPUB 3 have identical functionality
- Reduces code duplication
- Easy to identify version-specific issues

---

## Reference File Comparison

Many tests compare generated EPUBs against reference files:

```typescript
it('creates the same EPUB as the reference file', async () => {
  // Create EPUB programmatically
  const epub = createSimpleBook(EPUBBuilder);
  
  // Export to buffer
  const generatedBuffer = await epub.exportToBuffer();
  
  // Compare with reference file
  const referenceBuffer = await fs.readFile(SIMPLE_GUIDE_PATH);
  
  expect(generatedBuffer.equals(referenceBuffer)).toBe(true);
});
```

**Why Binary Comparison?**
- Ensures consistent output format
- Catches unintended changes in file structure
- Validates compression and packaging
- Verifies metadata encoding

**Limitations:**
- Timestamps may cause failures (tests use mocked dates)
- UUIDs must be deterministic (tests use mocked UUIDs)

---

## Test Coverage Areas

### Metadata
- ✅ Required fields (title, creator, language)
- ✅ Optional fields (publisher, description, subject, rights, date)
- ✅ Metadata extraction from existing EPUBs
- ✅ Metadata updates

### Chapter Management
- ✅ Single chapters
- ✅ Multiple chapters
- ✅ Nested chapters (3+ levels deep)
- ✅ Chapter ordering
- ✅ Parent-child relationships
- ✅ Content addition and modification
- ✅ Chapter deletion

### Resources
- ✅ Image formats (JPEG, PNG, GIF, SVG, WebP)
- ✅ Cover images
- ✅ Image deduplication (by content hash)
- ✅ Custom stylesheets
- ✅ Default stylesheets
- ✅ Stylesheet deduplication

### File Operations
- ✅ Export to file
- ✅ Export to buffer
- ✅ Parse from file
- ✅ Parse from buffer

### Merging
- ✅ Two-book merge
- ✅ Multi-book merge (3+)
- ✅ Nested merging
- ✅ Duplicate resource handling
- ✅ Chapter hierarchy preservation

### Validation
- ✅ Structure validation
- ✅ Metadata validation
- ✅ Parent-child validation
- ✅ Error detection
- ✅ Warning generation

### Format Conversion
- ✅ EPUB 2 to EPUB 3 conversion
- ✅ Metadata preservation
- ✅ Chapter preservation
- ✅ Resource preservation

---

## Continuous Integration

The test suite is designed for CI/CD environments:

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: junit-results
          path: junit.xml
```

### JUnit XML Output

Tests generate `junit.xml` for CI systems:

```bash
npm test  # Generates junit.xml automatically
```

---

## Known Test Limitations

### 1. Sequential Execution Required

Tests must run sequentially (`--runInBand`) due to shared temporary directory usage.

**Why:** Parallel tests could conflict when reading/writing temp files.

**Solution:** Use `--runInBand` flag (already configured in npm test script).

### 2. Deterministic UUIDs and Dates

Reference file comparisons require mocked UUIDs and timestamps.

**Implementation:**
```typescript
jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.useFakeTimers().setSystemTime(new Date('1970-01-01T00:00:00Z'));
```

### 3. Temporary File Cleanup

Each test suite manages its own temp directory:

```typescript
const TEMP_DIR = path.join(__dirname, 'temp');

beforeAll(async () => {
  await fs.ensureDir(TEMP_DIR);
});

afterAll(async () => {
  await fs.remove(TEMP_DIR);
});
```

---

## Adding New Tests

### Template for New Test Suite

```typescript
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { EPUB2Builder, EPUB3Builder } from '../src';

const TEMP_DIR = path.join(__dirname, 'temp');

describe.each([
  { version: 2, EPUBBuilder: EPUB2Builder },
  { version: 3, EPUBBuilder: EPUB3Builder },
])('EPUB $version New Feature', ({ EPUBBuilder }) => {
  
  beforeAll(async () => {
    await fs.ensureDir(TEMP_DIR);
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  it('tests the new feature', async () => {
    const epub = new EPUBBuilder({
      title: 'Test Book',
      creator: 'Test Author',
      language: 'en',
    });

    // Test implementation
    
    const validation = epub.validate();
    expect(validation.isValid).toBe(true);
  });
});
```

### Best Practices

1. **Use parameterized tests** for features that work in both EPUB 2 and 3
2. **Clean up temp files** in `afterEach()` or `afterAll()`
3. **Validate EPUBs** before assertions
4. **Use reference files** for complex scenarios
5. **Mock UUIDs and dates** when comparing binary output
6. **Test error cases** in addition to success cases

---

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "test name pattern"
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

### Inspect Generated Files

Comment out the cleanup code to inspect generated EPUBs:

```typescript
afterAll(async () => {
  // await fs.remove(TEMP_DIR);  // Comment this out
});
```

Then check `test/temp/` for generated files.

---

## Test Results

Current test results (all passing):

```
Test Suites: 5 passed, 5 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        ~5-10s
```

---

## See Also

- [Main README](../README.md) - Project overview
- [API Reference](API_REFERENCE.md) - API documentation
- [Examples](EPUB_BUILDER_EXAMPLES.md) - Code examples
