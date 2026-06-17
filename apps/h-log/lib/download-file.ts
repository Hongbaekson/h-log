export function createAttachmentContentDisposition(filename: string, fallbackFilename: string) {
  return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
