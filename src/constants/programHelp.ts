/* Words a program shows on screen, explained once in `glossary.<term>` */
export type GlossaryTerm =
  | 'note'
  | 'octave'
  | 'sharpFlat'
  | 'cents'
  | 'semitone'
  | 'hz'
  | 'clarity'
  | 'voiceParts'
  | 'voiceRange'
  | 'solfege'
  | 'scale'
  | 'key'
  | 'chord'
  | 'harmony'
  | 'staff'
  | 'bpm'

export type ProgramHelp = {
  /* How many `programHelp.<key>.stepN` strings exist, starting at step1 */
  stepCount: number
  terms: GlossaryTerm[]
}

/* Keyed by `Program.key` in programs.ts — the help button reads it by route */
export const programHelpByKey: Record<string, ProgramHelp> = {
  pitchDetector: {
    stepCount: 3,
    terms: [
      'note',
      'octave',
      'sharpFlat',
      'cents',
      'hz',
      'clarity',
      'voiceParts',
    ],
  },
  warmUp: { stepCount: 3, terms: ['note', 'semitone', 'voiceRange'] },
  notes: { stepCount: 3, terms: ['note', 'octave', 'sharpFlat', 'staff'] },
  piano: { stepCount: 3, terms: ['note', 'octave', 'scale', 'key'] },
  guitar: { stepCount: 3, terms: ['note', 'scale', 'key'] },
  scaleDetector: { stepCount: 3, terms: ['note', 'scale', 'key', 'chord'] },
  songRecorder: { stepCount: 3, terms: ['note', 'staff', 'bpm'] },
  toneDetector: { stepCount: 3, terms: ['note', 'octave', 'chord', 'harmony'] },
  tuner: {
    stepCount: 3,
    terms: ['note', 'sharpFlat', 'cents', 'semitone', 'hz', 'clarity'],
  },
  singTone: { stepCount: 3, terms: ['note', 'cents', 'voiceRange'] },
  doReMi: { stepCount: 3, terms: ['solfege', 'note', 'cents', 'voiceRange'] },
  singTheKeys: { stepCount: 3, terms: ['note', 'voiceRange'] },
  graceKelly: { stepCount: 3, terms: ['harmony', 'note', 'bpm'] },
  singFly: { stepCount: 3, terms: ['note', 'voiceRange'] },
  pitchGame: { stepCount: 3, terms: ['note', 'voiceRange'] },
  circleOfFifths: { stepCount: 3, terms: ['solfege', 'key'] },
}
