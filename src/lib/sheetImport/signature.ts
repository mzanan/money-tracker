export const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
export const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];
export const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];

export function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

export function isSpreadsheetBinary(bytes: Uint8Array): boolean {
  return (
    hasSignature(bytes, ZIP_SIGNATURE) || hasSignature(bytes, OLE_SIGNATURE)
  );
}
