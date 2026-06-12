import { File } from "expo-file-system";

/**
 * Best-effort deletion of a local cache file (a camera capture or a cropped
 * image written by expo-image-manipulator). Synchronous and never throws, so
 * it's safe to call on cleanup paths; a no-op if the file is already gone or
 * the uri isn't a local file. Keeps the OS cache from accumulating orphaned
 * proof/avatar images after a drop completes or is cancelled (COM-139).
 */
export function deleteLocalFile(uri: string | null | undefined): void {
  if (!uri || !uri.startsWith("file:")) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best-effort — never let it break the calling flow.
  }
}
