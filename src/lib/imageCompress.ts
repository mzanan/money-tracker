const MAX_DIMENSION = 2000;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "image.jpg", { type: OUTPUT_TYPE });
  } catch {
    return file;
  }
}
