/*
 * Tried in order. MP4/AAC first because the download then opens in every music
 * app; a bare 'audio/mp4' comes after WebM because Chromium can satisfy it with
 * Opus inside MP4, which many players refuse.
 */
const PREFERRED_MIME_TYPES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

/* undefined lets the browser use its own default. */
export function pickRecorderMimeType(
  isSupported: (mimeType: string) => boolean,
): string | undefined {
  return PREFERRED_MIME_TYPES.find(isSupported)
}

export function fileExtensionFor(mimeType: string): string {
  if (mimeType.startsWith('audio/mp4')) return 'm4a'
  if (mimeType.startsWith('audio/webm')) return 'webm'
  if (mimeType.startsWith('audio/ogg')) return 'ogg'
  if (mimeType.startsWith('audio/wav')) return 'wav'

  /* Audio-only WebM is the common default when a browser names no type. */
  return 'webm'
}

/* voice-recording-2026-11-04-1530.m4a, in the singer's own time zone. */
export function takeFileName(mimeType: string, recordedAt: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = [
    recordedAt.getFullYear(),
    pad(recordedAt.getMonth() + 1),
    pad(recordedAt.getDate()),
  ].join('-')
  const time = `${pad(recordedAt.getHours())}${pad(recordedAt.getMinutes())}`

  return `voice-recording-${date}-${time}.${fileExtensionFor(mimeType)}`
}
