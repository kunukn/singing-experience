/* Cents within this of the note show as "about zero". A held note jitters
 * by a few cents in the detector, and nobody hears 2¢, so the readout would
 * only flicker -1¢, 0¢, +2¢. Display only: colours, meters and whether a note
 * counts as clean are still decided from the exact pitch. */
export const CENTS_DEAD_ZONE = 2

/* Inside the dead zone the cents text reads ≈0¢: "0¢" would claim a
 * precision the wobbling line beside it disproves, and an empty label came
 * and went on every wobble, shifting the note name beside it. No "-": that
 * is the flat sign. */
export const NEAR_ZERO_CENTS_TEXT = '≈0¢'

/* Rounded first, so 2.4¢ (shown as 2) is inside and 2.6¢ (shown as 3) is out */
export const isNearZeroCents = (cents: number) =>
  Math.abs(Math.round(cents)) <= CENTS_DEAD_ZONE
