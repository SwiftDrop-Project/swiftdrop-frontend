import { PROOF_MAX_BYTES, PROOF_MESSAGES, proofFileError } from "../schemas";

/*
 * Getting a proof-of-delivery photo ready to upload, in the browser. The photo is drawn upright (phones store the
 * orientation in EXIF, which the backend removes), made at most MAX_SIDE pixels on its longer side and saved as a
 * JPEG. That also drops the camera's EXIF/GPS data on the device and keeps phone photos well under the 5 MB limit.
 * When the browser can't decode the file (an unusual format), the original is sent and the backend checks it.
 */

const MAX_SIDE = 2560;
const JPEG_QUALITY = 0.85;

export interface PreparedProofPhoto {
  blob: Blob;
  fileName: string;
}

export class ProofPhotoError extends Error {}

/**
 * The photo to upload for {@code file}.
 *
 * @throws ProofPhotoError with the courier's words when the file can't be used
 */
export async function prepareProofPhoto(file: File): Promise<PreparedProofPhoto> {
  const problem = proofFileError(file);
  if (problem) throw new ProofPhotoError(problem);
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return { blob: file, fileName: file.name || "delivery-slip.jpg" };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ProofPhotoError(PROOF_MESSAGES.unreadable);
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return { blob: file, fileName: file.name || "delivery-slip.jpg" };
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return { blob: file, fileName: file.name || "delivery-slip.jpg" };
    if (blob.size > PROOF_MAX_BYTES) throw new ProofPhotoError(PROOF_MESSAGES.tooLarge);
    // The backend takes the type from the bytes, never from the name; the name is kept as the courier chose it.
    return { blob, fileName: file.name || "delivery-slip.jpg" };
  } finally {
    bitmap.close();
  }
}
