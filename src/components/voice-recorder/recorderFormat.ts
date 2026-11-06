/* New takes are WAV. The other types are takes saved by the earlier
 * MediaRecorder version, which still reload from storage. */
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

/* "576 kB" / "5.8 MB", in decimal units like the "MB a minute" copy. */
export function formatFileSize(bytes: number, locale: string): string {
  const kilobytes = Math.max(1, Math.round(bytes / 1e3))
  /* Decided after rounding, so 999.6 kB reads "1 MB" and not "1,000 kB". */
  const isUnderMegabyte = kilobytes < 1000

  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: isUnderMegabyte ? 'kilobyte' : 'megabyte',
    unitDisplay: 'short',
    maximumFractionDigits: isUnderMegabyte ? 0 : 1,
  }).format(isUnderMegabyte ? kilobytes : bytes / 1e6)
}
