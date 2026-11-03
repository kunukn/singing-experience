# Famous Singer Vocal Ranges for the Explore Chart

## Executive Summary

The singer bars on the Voice Range Finder's Explore tab ([famousSingers.ts](../../src/components/voice-range-finder/famousSingers.ts)) are **estimates written from memory, not sourced data**. They are unchecked against sheet music or recordings.

We found no authoritative source for these ranges. Pages disagree with each other, one page disagrees with itself, and most name no method. For four of the eight singers, no page we could read gives a personal range at all.

The chart uses estimates because published extremes would make it useless: clipped to E2–C6, the published figures nearly fill the chart, so the bars look alike. Treat every number in the app as a placeholder until it is checked against sheet music.

All pages were read on 2026-11-03.

---

## App Ranges Against What We Found

"Personal figure" means a page states a range for that singer. "Category only" means the page lists the singer under a voice type, which says nothing about that singer's own notes.

| Singer          | App range | Personal figures found                                                        | Category only            |
| --------------- | --------- | ----------------------------------------------------------------------------- | ------------------------ |
| Mariah Carey    | A3–C6     | F2–G7 (Classic FM); G2–G7 and G♯2–E7 (Superprof)                              | Soprano                  |
| Whitney Houston | G3–A♯5    | C3–C6 and C3–G♯5 (Superprof)                                                  | Soprano, Mezzo-Soprano   |
| Michael Jackson | C3–A5     | None                                                                          | None                     |
| Adele           | C3–F5     | B2–D6 (Superprof); C3 to F5 or G5, "some sources" to C6 (La Cocina de Gisele) | Mezzo-Soprano, Contralto |
| Freddie Mercury | F2–F5     | F2–G♯5 and F2–E6 (Superprof); F2 and E6, called estimates (Musician Wave)     | Tenor                    |
| Elvis Presley   | G2–A4     | None                                                                          | Baritone                 |
| Frank Sinatra   | G2–F4     | None                                                                          | Baritone                 |
| Johnny Cash     | E2–D4     | None                                                                          | Bass                     |

Where a singer has two figures from Superprof, the first is from its table and the second from its body text.

**Agreement with the app:**

- **Adele:** C3–F5 matches the La Cocina de Gisele figure, which that page attributes to tumblr.com.
- **Freddie Mercury:** the F2 low matches, but no page we read gives F5 as his top.
- **Everyone else:** nothing we read supports or contradicts the numbers directly. Mariah Carey and Whitney Houston's lows sit well above the published figures, on purpose, because the app shows the regularly sung range.

---

## Sources

### Personal figures

| Source                                                                                                    | What it says                                                                                                                                                                     | Date       | Method or source named                                                       |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| [Superprof](https://www.superprof.com/blog/broadest-vocal-range-singers/)                                 | The figures in the table above. Its table and body text disagree for Carey, Mercury and Houston                                                                                  | 2025-05-19 | None                                                                         |
| [Classic FM](https://www.classicfm.com/discover-music/singer-vocal-ranges/)                               | Carey "a low F2 and hit an unbelievable G7". Bowie and Mercury "both had ranges spanning four octaves", without notes                                                            | 2022-05-16 | None                                                                         |
| [Musician Wave](https://www.musicianwave.com/?p=603751)                                                   | Mercury: "The exact F2 and E6 endpoints often cited for these recordings are estimates". Carey: "The precise span depends on which recorded notes and vocal effects are counted" | 2026-10-01 | Says most octave figures "come from listeners comparing selected recordings" |
| [La Cocina de Gisele](https://lacocinadegisele.com/knowledgebase/who-has-the-greatest-voice-ever)         | Adele "from around C3 to F5 or G5, though some sources suggest notes as high as C6". An aggregated Q&A page                                                                      | Not shown  | Labels the answer as from tumblr.com                                         |
| [The People's Orchestra](https://thepeoplesorchestra.com/?p=4000)                                         | Carey "five-octave range", Mercury "four-octave range", without notes                                                                                                            | Not shown  | None                                                                         |
| [Bolavip](https://spoiler.bolavip.com/en/celebrities/the-20-singers-with-the-most-range-in-music-history) | Carey "spanning five octaves", without notes                                                                                                                                     | 2026-01-17 | None                                                                         |

**Musician Wave is the most useful read here.** It is the only page that questions the numbers. It says a 2016 acoustic study "did not establish" Mercury's four-octave span, and that Guinness documents attempts only for Tim Storms and Georgia Brown.

### Category only

These list singers under a voice type. Don't cite them as a singer's own range.

| Source                                                                                                             | Bass               | Baritone                | Tenor          | Mezzo-Soprano         | Soprano               |
| ------------------------------------------------------------------------------------------------------------------ | ------------------ | ----------------------- | -------------- | --------------------- | --------------------- |
| [GC Players](https://www.gcplayers.com/whats-your-vocal-range)                                                     | E2–E4: Cash, White | G2–G4: Presley, Sinatra | C3–B4: Mercury | A3–F5: Adele          | C4–A5: Carey          |
| [Doctor Mix](https://doctormix-website-git-main-realdoctormixs-projects.vercel.app/blog/singers-vocal-range-chart) | E2–E4: Cash, White | G2–G4: Presley, Sinatra | C3–C5: Mercury | A3–A5: Adele          | C4–C6: Carey, Houston |
| [Superprof](https://www.superprof.com/blog/broadest-vocal-range-singers/)                                          | E2–E4: Cash, White | A2–A4: Presley, Sinatra | C3–C5: Mercury | A3–A5: Houston, Adele | C4–C6: Carey, Houston |

[Merriam Music](https://www.merriammusic.com/school-of-music/vocal-range/) also names Presley as a baritone (G2–G4 in its text, G2–F4 in its chart) and calls Adele a contralto. It says Mercury's high notes "were within his falsetto".

### Read, but no usable figures

- [muted.io](https://muted.io/singers-vocal-range/) names The Range Planet and Singing Carrots as its data sources, and lists all our singers. Its chart text is an unlabelled run of notes that doesn't line up with its list of names, so notes can't be matched to singers. An earlier read matched high notes by position, for example Adele B♭5 and Michael Jackson C♯6. Don't rely on those.
- [Rolling Stone India](https://rollingstoneindia.com/chart-vocal-ranges-worlds-greatest-singers) and [Far Out](https://faroutmagazine.co.uk/the-singer-with-the-greatest-recorded-vocal-range-of-all-time/) report the Concert Hotels chart without per-singer figures. Rolling Stone India says its data came "from The Range Place".
- [Shortlist](https://www.shortlist.com/news/great-infographic-of-singers-vocal-ranges) has the figures only in an image, which we couldn't read.

### Could not read

| Source                                                                                           | Why                                                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [The Range Planet](https://www.therangeplanet.com/)                                              | DNS lookup failed                                                                |
| [Concert Hotels chart](http://www.concerthotels.com/worlds-greatest-vocal-ranges)                | Not fetched. It's the original of the widely shared 2014 chart, so check it next |
| [2016 Mercury acoustic study](https://www.tandfonline.com/doi/abs/10.3109/14015439.2016.1156737) | HTTP 403. Known only through Musician Wave, so we have no citation details       |
| [School of Rock](https://schoolofrock.com/resources/vocals/how-to-find-your-vocal-range)         | HTTP 403                                                                         |
| Open Ear Music, Gizmodo Australia                                                                | Redirected to site home pages                                                    |

---

## Figures We Could Not Trace

Web search summaries returned these, and they were quoted during the feature's planning. **None appears on any page we read, so don't cite them:**

- Elvis Presley F♯1–A5
- Johnny Cash D♯2–B5
- Freddie Mercury F2–F5 and F2–D7
- Mariah Carey G♯2–G7
- Barry White C3–A4
- Whitney Houston C3–C7, and "3.5 octaves" or "five octaves"

They may exist on a page we didn't read, but we can't say which. The app's F2–F5 for Mercury is the same as one of these figures, so it has no traceable source either.

---

## Why Published Extremes Don't Work on This Chart

The chart spans E2–C6. Clipped to that span, the extremes above nearly fill it:

| Singer          | Published | Clipped to the chart |
| --------------- | --------- | -------------------- |
| Mariah Carey    | F2–G7     | F2–C6                |
| Freddie Mercury | F2–E6     | F2–C6                |
| Adele           | B2–D6     | B2–C6                |
| Whitney Houston | C3–C6     | C3–C6                |

Extremes also count falsetto, whistle notes and vocal effects, as Musician Wave and Merriam Music point out. The chart's question is "could this singer sing the note I'm singing?", and a one-off whistle note doesn't answer that.

---

## Open Items

1. **Check the ranges against sheet music.** Published scores for each singer's well-known songs give a vocal range you can verify, but check the score's key matches the recording. This would give the app a method that can be cited.
2. **Revisit the legend after item 1.** It says "Rough estimates of their usual range", in all 15 locale files, which is accurate today. Firmer wording, such as saying the ranges come from their songs, needs item 1 done first.
3. **Read the Concert Hotels chart and the 2016 study**, if access can be found.
