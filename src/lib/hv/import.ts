import { fileExtension, sha256 } from "./format";
import { SUPPORTED_FORMATS } from "./types";

export const ACCEPT_ATTR = "audio/*," + SUPPORTED_FORMATS.map((f) => "." + f).join(",");

const MIME_TO_EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

export function detectFormat(file: File) {
  const ext = fileExtension(file.name);
  if (ext) return ext;
  return MIME_TO_EXT[file.type.split(";")[0] ?? ""] ?? "audio";
}

export function isSupportedAudio(file: File) {
  const ext = fileExtension(file.name);
  return (SUPPORTED_FORMATS as readonly string[]).includes(ext) || file.type.startsWith("audio/");
}

export function probeDuration(file: File, timeoutMs = 6000): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    let done = false;
    const finish = (d: number) => {
      if (done) return;
      done = true;
      a.src = "";
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    a.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(a.duration)) finish(a.duration);
      else {
        // Some ogg/opus files report Infinity until seeked to the end.
        a.addEventListener("durationchange", () => Number.isFinite(a.duration) && finish(a.duration));
        a.currentTime = 1e7;
      }
    });
    a.addEventListener("error", () => finish(0));
    setTimeout(() => finish(a.duration), timeoutMs);
    a.src = url;
  });
}

export async function hashFile(file: File) {
  return sha256(await file.arrayBuffer());
}
