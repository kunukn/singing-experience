import type { Take } from './useVoiceRecorder'

/* Long enough for a whole song. Decoded for analysis that is about 25 MB, and a
 * phone works through it in well under a minute. */
export const MAX_UPLOAD_MS = 5 * 60 * 1000
/* The whole file is read into memory before decoding, so this catches files
 * that would run a phone out of memory before their length could be checked.
 * Five minutes of 24-bit 48 kHz stereo WAV is about 86 MB. Decimal, like the
 * sizes shown on the download buttons. */
export const MAX_UPLOAD_BYTES = 100_000_000
/* Some files make a browser go quiet instead of reporting an error. */
const METADATA_TIMEOUT_MS = 10_000

export type UploadErrorKey =
  | 'voiceRecorder.upload.notAudio'
  | 'voiceRecorder.upload.tooLong'
  | 'voiceRecorder.upload.tooBig'

export type UploadResult = { take: Take } | { errorKey: UploadErrorKey }

/* Reads only the header, so it is quick even for a long file, and it rejects
 * files this browser can't play. Can be Infinity for WebM without a length. */
export function readMediaDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(blob)

    const finish = (settle: () => void) => {
      clearTimeout(timeout)
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      settle()
    }
    const timeout = setTimeout(
      () => finish(() => reject(new Error('Timed out reading the file'))),
      METADATA_TIMEOUT_MS,
    )

    audio.preload = 'metadata'
    audio.addEventListener(
      'loadedmetadata',
      () => finish(() => resolve(audio.duration)),
      { once: true },
    )
    audio.addEventListener(
      'error',
      () => finish(() => reject(new Error('The file could not be played'))),
      { once: true },
    )
    audio.src = url
  })
}

function isMediaType(type: string): boolean {
  return type.startsWith('audio/') || type.startsWith('video/')
}

/*
 * Checks a picked file before it replaces the current take, so a file that
 * can't be used never costs the singer the take they already have. There is no
 * list of allowed formats: which ones decode differs between browsers, so the
 * browser itself is asked. An empty type is let through, because some systems
 * name no type for files they don't know.
 */
export async function createUploadedTake(
  file: File,
  { readDuration = readMediaDuration } = {},
): Promise<UploadResult> {
  if (file.type !== '' && !isMediaType(file.type)) {
    return { errorKey: 'voiceRecorder.upload.notAudio' }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { errorKey: 'voiceRecorder.upload.tooBig' }
  }

  let durationSeconds: number
  try {
    durationSeconds = await readDuration(file)
  } catch {
    return { errorKey: 'voiceRecorder.upload.notAudio' }
  }

  /* An unknown length (Infinity) gets through: the size limit still holds. */
  if (
    Number.isFinite(durationSeconds) &&
    durationSeconds * 1000 > MAX_UPLOAD_MS
  ) {
    return { errorKey: 'voiceRecorder.upload.tooLong' }
  }

  return {
    take: {
      blob: file,
      mimeType: file.type,
      /* Now rather than the file's own date: the player and analysis are keyed
       * by this, so opening the same file again must still start afresh. */
      recordedAt: new Date(),
      stopReason: 'user',
      hasAutoGain: false,
      source: 'uploaded',
    },
  }
}
