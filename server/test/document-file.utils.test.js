import test from "node:test";
import assert from "node:assert/strict";
import { detectDocumentFileType } from "#utils/document-file.utils.js";

test("detects supported document formats from their file signatures", () => {
  assert.deepEqual(
    detectDocumentFileType(Buffer.from("%PDF-1.7")),
    { contentType: "application/pdf", extension: "pdf" }
  );
  assert.deepEqual(
    detectDocumentFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])),
    { contentType: "image/jpeg", extension: "jpg" }
  );
  assert.deepEqual(
    detectDocumentFileType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    { contentType: "image/png", extension: "png" }
  );
});

test("rejects a file without a supported document signature", () => {
  assert.equal(detectDocumentFileType(Buffer.from("<script>alert(1)</script>")), null);
  assert.equal(detectDocumentFileType(Buffer.alloc(0)), null);
});
