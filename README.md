# <picture><source media="(prefers-color-scheme: dark)" srcset="public/icons/note-inverted.svg"><img src="public/icons/note.svg" width="32" height="32" alt="music note" /></picture> Singing Experience

[![License: 0BSD](https://img.shields.io/badge/license-0BSD-green.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-syng.fun-blue)](https://www.syng.fun/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-blueviolet)](#-offline--installable)

**Sing into your microphone and see what note you're singing — in real time, in your browser.**

Singing Experience is a free web app for exploring your voice: practice singing, train your ear, tune an instrument, or play a singing game. No musical training needed, no account, no server — everything runs on your device.

## 🌐 Try It

<a href="https://www.syng.fun"><img src="docs/doremi-demo.png" alt="DO RE MI Game — sing through the scale and see how close you are to each note" width="600" /></a>

**[www.syng.fun](https://www.syng.fun)** · [kunukn.github.io/singing-experience](https://kunukn.github.io/singing-experience)

<img src="docs/qr-live-demo.png" alt="QR code for live demo" width="200" />

## ✨ What's Inside

Everything is reachable from the home screen, split into **🎛️ Music Tools** and **🕹️ Singing Games**.

### 🎛️ Music Tools

| Tool                | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| 🎤 Pitch Detector   | Shows the note, frequency, and how sharp or flat you are — with a pitch history chart             |
| 🎙️ Vocal Warm-Up    | Guided pitch sequences that transpose up a half step each round                                   |
| 🎵 Notes            | Every note on the staff, with its name and sound                                                  |
| 🎹 Piano            | Play the keys and watch your voice land on the keyboard                                           |
| 🎸 Guitar           | Play the fretboard and watch your voice land on it                                                |
| 🪕 Instrument Tuner | Guitar and ukulele tunings with a cents bar and an in-tune chime                                  |
| 🎚️ Tone Detector    | Picks up several notes at once — sing or play a harmony and see every tone                        |

The tools all listen to your voice in real time and show you where it lands — on a chart, a staff, a keyboard, or a fretboard. Tap a note to hear it, sing it back, and compare. Each tool has its own settings — voice range, reference pitch, scale highlighting, note names, tuning, and more.

### 🕹️ Singing Games

| Game                   | What you do                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| 🎯 Sing Tone Game      | A random tone plays — sing it back. Match a row of them to win           |
| 🎶 DO RE MI Game       | Sing up the scale, holding each note steady to advance                   |
| 👑 Grace Kelly Challenge | Sing along to MIKA's "Grace Kelly" with real sheet music and harmonies |
| 🐦 Singfly             | Your pitch flies the bird through the gaps                               |
| 🎼 Pitch Game          | Hit as many scrolling target notes as you can before the clock runs out  |

Each program has its own settings — voice range, difficulty, tempo, hold time, and more. The DO RE MI Game alone offers 40+ scale modes spanning classical, jazz, and world music.

## 📲 Offline & Installable

Works fully offline after the first visit, and installs like a native app via "Add to Home Screen" (mobile) or your browser's install option (desktop). Updates apply automatically in the background.

## 🌍 Languages

Available in 15 languages, covering roughly 68% of the world's population:

🇬🇧 English · 🇨🇳 中文 · 🇪🇸 Español · 🇮🇳 हिन्दी · 🇸🇦 العربية · 🇧🇩 বাংলা · 🇧🇷 Português · 🇷🇺 Русский · 🇯🇵 日本語 · 🇫🇷 Français · 🇩🇪 Deutsch · 🇮🇩 Bahasa Indonesia · 🇹🇿 Kiswahili · 🇩🇰 Dansk · 🇬🇱 Kalaallisut

## 🔒 Your Privacy

**Everything happens on your device.** This is a static app — there is no server and no backend.

- Your microphone audio is **never recorded**
- Your voice data is **never sent anywhere**
- The app analyzes your voice in real time and shows the result on screen, nothing more

You'll be asked to allow microphone access when you start a program. That's a standard browser permission, and you can revoke it any time in your browser settings.

## 🚀 Run It Yourself

You need [Node.js](https://nodejs.org/) 24 or later.

```sh
git clone https://github.com/kunukn/singing-experience.git
cd singing-experience
npm install
npm run dev
```

Then open the address shown in the terminal (usually `http://localhost:5555`). That's it — the app runs entirely in your browser.

> Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for the full list of npm scripts and the script naming convention.

## 🛡️ Dependency safety

The committed `.npmrc` hardens `npm install` against supply-chain attacks:

- **Public registry only** — installs are pinned to `registry.npmjs.org`.
- **2-day cooldown** — only package versions published at least 2 days ago can be
  installed (`min-release-age=2`). This dodges most freshly-published malicious
  releases before they reach your lockfile.
- **Exact versions** — newly added dependencies are pinned (`save-exact=true`).
- **Strict audits & engines** — `npm audit` fails on high/critical issues, and the
  Node 24+ / npm 11+ requirement is enforced.

**Urgent vetted patch** newer than the cooldown window? Override per command:

```sh
npm i <package> --min-release-age=0
```

This is a guardrail, not a hard lock — a CLI flag or environment variable can
still override it, so true enforcement needs a registry firewall. `npm ci`
installs the exact lockfile versions and is unaffected by the cooldown, so CI
stays deterministic.

## Troubleshooting

### 🎤 Microphone access was denied

If you accidentally blocked microphone access, the browser remembers your choice and won't ask again. The app needs microphone permission to hear your voice — without it, nothing will work.

**How to re-enable:**

- **Chrome / Edge (desktop)** — click the 🔒 lock (or tune/slider) icon in the address bar → find **Microphone** → change to **Allow** → reload the page.
- **Firefox (desktop)** — click the 🔒 lock icon → **Connection secure** → **More information** → **Permissions** tab → find **Use the Microphone** → remove the block.
- **Safari (Mac)** — Safari menu → **Settings** → **Websites** → **Microphone** → find the site and change to **Allow**.
- **Safari (iPhone / iPad)** — open **Settings** → **Safari** → **Microphone** → set to **Allow** (or **Ask**).
- **Chrome (Android)** — tap the 🔒 lock icon in the address bar → **Permissions** → **Microphone** → change to **Allow**.

### 🔐 Why does iOS keep asking for microphone permission on a specific website even though I have accepted?

iOS Safari treats web microphone permission as per-session by default, not per-site. "Accepting" only lasts until the tab/browser closes.

**On iOS, use Safari.** Only Safari exposes the per-site permission toggle below — other iOS browsers (Chrome, Firefox, Edge) all run on the same WebKit engine but hide this setting, so they keep re-asking every session.

**Two durable fixes:**

1. **Set the site's permission to Allow** (Safari only) — tap the **aA** (page settings) button in the address bar → **Website Settings** → set **Microphone** to **Allow**. You can also set the global default in **Settings → Safari → Microphone**.

<img src="docs/ios-page-menu.png" alt="iOS Safari Page Menu showing Website Settings for syng.fun with Microphone set to Ask" width="280" />

2. **Install it to the Home Screen** (most reliable, works in any iOS browser) — use **Share → Add to Home Screen**, then launch the app from its home-screen icon. As an installed PWA it runs in its own permission scope, so the microphone grant persists across launches instead of resetting every session.

<img src="docs/ios-add-to-home-screen.png" alt="iOS Safari showing Add to Home Screen" width="280" />

### 🔇 No sound on iPhone or iPad

iPhones and iPads have a **silent mode switch**. When silent mode is on, the browser cannot play any audio — even if the in-app volume is fine.

**Fix:**

- **Older models** — flip the physical silent switch off (so no orange is visible).
- **Newer iPhones and iPads** — open **Control Center** and tap the **Silent Mode** button to turn it off.
- Also check that **Do Not Disturb** is off (Control Center → Focus → Do Not Disturb), as it can suppress audio too.

### 🔁 Sound stops working on iPhone or iPad

iOS Safari is strict about how web pages are allowed to use audio. After certain events, the browser may **suspend** or **interrupt** the app's audio engine, and sound stops playing — even though the buttons still respond.

Common triggers on iOS:

- Switching to another app or browser tab
- Locking the screen or letting it auto-lock
- Receiving a phone call, FaceTime, or activating Siri
- Connecting or disconnecting AirPods, Bluetooth headphones, or a speaker
- Long periods of inactivity in the tab

The app tries to recover automatically the next time you tap a button, but iOS does not always allow it.

**Reliable fix:** **reload the page**. This creates a fresh audio engine, which iOS lets the app use again on your next tap.

**To reduce the chance it happens:**

- Keep the Singing Experience tab in the foreground while you play
- Avoid switching to other audio apps (music, video) mid-session
- Plug in or pair your headphones **before** starting a session, not during

### 🔈 No sound on Android or other tablets

- Make sure your device **volume is turned up** — use the physical volume buttons.
- Check that **Do Not Disturb** mode is off (it can suppress audio on some devices).
- If you're connected to **Bluetooth headphones or a speaker**, audio may be routed there instead of the device speaker.

### 🎧 Audio plays through the wrong output

If audio seems to play but you can't hear it, your device may be routing sound to a Bluetooth device, HDMI display, or AirPlay receiver. Disconnect external audio devices or switch the output in your device's audio settings.

## License

This project is open source under the [0BSD License](LICENSE). _do what you want, but don't blame me._
