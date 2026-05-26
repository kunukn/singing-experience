import type { NoteInfo } from '@/utils/noteUtils'

export type DetectedTone = NoteInfo & {
  isClean: boolean
}

export type ToneDetectionResult = {
  detectedTones: Readonly<Ref<readonly DetectedTone[]>>
  isListening: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void
  stop: () => void
}
