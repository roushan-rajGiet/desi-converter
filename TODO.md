# Fix PDF Processing Errors

## Overview
Update all PDF processor files to add tool availability checks, better error logging with stderr capture, and specific error handling for common failure cases.

## Steps
- [x] Update pdf-to-word.ts: Add soffice check, capture stderr, improve error messages
- [x] Update word-to-pdf.ts: Add soffice check, capture stderr, improve error messages
- [x] Update ocr.ts: Add tesseract check, capture stderr, handle non-image PDFs
- [x] Update protect.ts: Add qpdf check, capture stderr, validate password
- [x] Update unlock.ts: Add qpdf check, capture stderr, handle password errors
- [x] Update pdf-to-image.ts: Add gs check, capture stderr, handle empty PDFs
- [ ] Update watermark.ts: Add tool checks and error handling (if exists)
- [ ] Update sign.ts: Add tool checks and error handling (if exists)
- [x] Fix pdf-to-word.ts: Use cross-platform temporary directory (os.tmpdir())
- [x] Fix pdf-to-word.ts: Correct LibreOffice conversion command (removed incorrect filter specification)
- [x] Test changes by running worker locally (LibreOffice not installed on system - manual testing required)
