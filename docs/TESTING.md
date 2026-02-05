# Test Suite Documentation

## Overview

This test suite provides comprehensive end-to-end testing for the epub-editor library, covering EPUB creation, parsing, editing, merging, and validation.

## Test Structure

```
test/
├── epub-creation.test.ts    # Tests for creating EPUBs from scratch
├── epub-parsing.test.ts     # Tests for parsing existing EPUB files
├── epub-editing.test.ts     # Tests for editing/modifying EPUBs
├── epub-merging.test.ts     # Tests for merging multiple EPUBs
├── validation.test.ts       # Tests for EPUB validation logic
├── resources/               # Test fixtures
│   └── simple-guide.epub    # Sample EPUB for parsing tests
└── temp/                    # Temporary directory (auto-cleaned)
```

## Test Fixtures

### resources/simple-guide.epub

**Source**: Copied from `examples/simple-guide.epub`

**Description**: A complete, valid EPUB 3.3 file created by running the `simple-example.ts` script. This EPUB contains:
- Multiple chapters with nested structure
- Two parts (Part I and Part II) with sub-chapters
- Introduction and Conclusion chapters
- Valid EPUB 3.3 metadata (title, author, language, etc.)
- Navigation document (nav.xhtml)
- Package document (OPF)
- Proper EPUB directory structure

**Used in**: 
- `epub-parsing.test.ts` - For testing EPUB file parsing
- `epub-editing.test.ts` - As a base for edit operations

**Purpose**: Provides a real-world EPUB file to test parsing and editing functionality without needing to generate one programmatically in each test.

**Decision**: ✅ **Recommended to include**
- **Pros**: 
  - Ensures tests work with real EPUB files
  - Faster test execution (no need to generate EPUB in beforeAll)
  - Tests the actual file format compliance
  - Small file size (~3-4 KB)
- **Cons**: 
  - Adds a binary file to the repository
  - Creates dependency on example output
  
**Alternative**: If you prefer not to include the fixture:
- Modify `beforeAll()` in parsing/editing tests to programmatically create a test EPUB
- This will increase test execution time by ~100-200ms per test suite

### temp/ directory

**Purpose**: Temporary storage for EPUBs created during test execution. Automatically cleaned after each test using `afterEach()` and `afterAll()` hooks.

**Decision**: ✅ **Directory should exist but be empty** - It's created automatically by the tests and cleaned up, so it should be git-ignored.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test epub-creation.test.ts

# Run tests in watch mode (if configured)
npm test -- --watch
```

## Test Coverage

### EPUB Creation Tests (87 total tests passing)
- ✅ Basic EPUB creation with minimal/full metadata
- ✅ Export to file and buffer
- ✅ Single and multiple chapters
- ✅ Nested chapter hierarchies
- ✅ HTML content in chapters
- ✅ Adding images and stylesheets
- ✅ Complete book creation workflow
- ✅ Validation

### EPUB Parsing Tests
- ✅ Parse existing EPUB files
- ✅ Error handling for invalid files
- ✅ Extract metadata, chapters, images, stylesheets
- ✅ Parse buffer and file inputs
- ✅ Handle complex chapter structures

### EPUB Editing Tests
- ✅ Append content to existing chapters
- ✅ Update metadata
- ✅ Add new chapters to parsed EPUBs
- ✅ Re-export edited EPUBs
- ✅ Preserve existing structure

### EPUB Merging Tests
- ✅ Merge multiple EPUBs
- ✅ Handle duplicate images (deduplication)
- ✅ Handle duplicate stylesheets
- ✅ Merge metadata from multiple sources
- ✅ Preserve chapter structure
- ✅ Export merged EPUBs

### Validation Tests
- ✅ Validate required metadata
- ✅ Validate chapter structure
- ✅ Validate resource references
- ✅ Complex EPUB validation

## Configuration

### Jest Configuration (`jest.config.js`)

Key settings:
- `testTimeout: 10000` - Allows time for EPUB file operations
- `testEnvironment: "node"` - Uses Node.js environment
- `transformIgnorePatterns` - Handles uuid ESM module
- `--runInBand` - Runs tests sequentially to avoid file conflicts

## Maintenance Notes

### Regenerating Test Fixtures

If you need to regenerate `simple-guide.epub`:

```bash
npx ts-node examples/simple-example.ts
cp examples/simple-guide.epub test/resources/
```

### Adding New Tests

When adding new test files:
1. Follow the naming convention: `*.test.ts`
2. Use `TEMP_DIR` for any file outputs
3. Clean up in `afterEach()` or `afterAll()`
4. Focus on end-to-end workflows rather than unit tests

### Known Limitations

- Tests assume UTF-8 encoding
- Temporary files are stored locally (not using OS temp dir)
- Tests run sequentially to avoid race conditions
- Buffer parsing requires writing to temp file (EPUBBuilder.parse expects file path)
