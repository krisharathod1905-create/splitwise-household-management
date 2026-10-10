const allowedTypes = {
  pdf: { contentType: "application/pdf", extension: "pdf" },
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  png: { contentType: "image/png", extension: "png" },
};

export const detectDocumentFileType = (buffer) => {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return allowedTypes.pdf;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return allowedTypes.jpeg;
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return allowedTypes.png;
  }
  return null;
};
