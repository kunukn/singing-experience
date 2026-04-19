# <picture><source media="(prefers-color-scheme: dark)" srcset="public/icons/note-inverted.svg"><img src="public/icons/note.svg" width="32" height="32" alt="music note" /></picture> Singing Experience

[![License: 0BSD](https://img.shields.io/badge/license-0BSD-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://kunukn.github.io/singing-experience/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-blueviolet)](#-offline--installable)

**Real-time vocal pitch detector and singing game — practice singing, train your ear, detect notes and frequencies, all in the browser. Free, private, works offline.**

A fun, browser-based singing practice app. Use your microphone to see what note you're singing in real time — or play a game where you sing through the musical scale.

## What Is This?

Singing Experience is a small web app that listens to your voice through your device's microphone and tells you what musical note you're singing. It's designed for anyone who wants to explore their voice, warm up before singing, or just have fun with music — no musical training required.

## Features

### 🎤 Pitch Detector

Sing or hum into your microphone and instantly see:

- The **note** you're singing (like C, D, E, etc.)
- How **in-tune** you are (are you a little sharp or flat?)
- The **frequency** of your voice in real time

#### 💡 What can you use it for?

**🎙️ Singing & voice practice**

Warm up your voice and verify you're landing on target pitches. Use the voice range presets (Soprano, Alto, Tenor, Baritone, Bass, and more) to focus the display on your register. The cents deviation and pitch history chart reveal whether your intonation is solid or drifting over time.

**👂 Ear training**

Sing or hum an interval, then check whether you matched the pitch you intended. The pitch history chart gives a visual trace of your pitch over time — a flat line close to zero cents means you held the note rock-steady.

**🎼 Music education**

Demonstrate acoustics live: play a note and show students its frequency in Hz and its name on the musical scale. The visual feedback makes abstract concepts like "sharp" and "flat" immediately concrete.

**🎵 Composition & transcription**

Hum a melody fragment and read off the notes one by one. Useful for sketching out ideas when you don't have an instrument to hand or can't read sheet music on the fly.

**🎸 Instrument tuning**

Play a note on any acoustic instrument — guitar, ukulele, violin, piano, flute, recorder — and the app instantly shows the note name and how many cents off you are. A visual sharp/flat bar makes it easy to nudge the string or breath pressure until you land exactly on pitch.

### 🎶 DO RE MI Game

A step-by-step singing game that walks you through the classic musical scale — DO, RE, MI, FA, SO, LA, TI, DO.

- The app shows you which note to sing next
- Hold the note steady for a few seconds to advance
- A visual indicator shows how close you are to the target note
- Complete the full scale to win 🎉
- You can choose how long you need to hold each note (1–7 seconds)

### 📲 Offline & Installable

The app works fully offline after the first visit — all assets are cached by a service worker.

- **No internet required** after the initial load
- **Install it** like a native app: use "Add to Home Screen" on mobile or your browser's install option on desktop
- Updates are applied automatically in the background when a new version is available

## 🔒 Your Privacy

**Everything happens on your device.** This is a static app — there is no server and no backend.

- Your microphone audio is **never recorded**
- Your voice data is **never sent anywhere**
- No data leaves your browser — everything runs 100% locally on your device
- The app simply analyzes your voice in real time and shows you the result on screen

You will be asked to allow microphone access when you start a program. This is a standard browser permission — the app needs it to hear your voice. You can revoke this permission at any time in your browser settings.

## 🌐 Live Demo

**[https://kunukn.github.io/singing-experience/](https://kunukn.github.io/singing-experience/)**

<img src="docs/qr-live-demo.png" alt="QR code for live demo" width="200" />

The app is deployed to GitHub Pages and updates automatically on every push to `main`.

## Getting Started

To run the app on your own computer, you need [Node.js](https://nodejs.org/) installed (version 24 or later is recommended).

1. **Download or clone the project**

   ```sh
   git clone https://github.com/kunukn/singing-experience.git
   cd singing-experience
   ```

2. **Install dependencies**

   ```sh
   npm install
   ```

3. **Start the app**

   ```sh
   npm run dev
   ```

4. **Open your browser** and go to the address shown in the terminal (usually `http://localhost:5555`)

That's it! The app runs entirely in your browser.

## Troubleshooting

### 🔇 No sound on iPhone or iPad

iPhones and iPads have a **silent mode switch**. When silent mode is on, the browser cannot play any audio — even if the in-app volume is fine.

**Fix:**

- **Older models** — flip the physical silent switch off (so no orange is visible).
- **Newer iPhones and iPads** — open **Control Center** and tap the **Silent Mode** button to turn it off.
- Also check that **Do Not Disturb** is off (Control Center → Focus → Do Not Disturb), as it can suppress audio too.

### 🔈 No sound on Android or other tablets

- Make sure your device **volume is turned up** — use the physical volume buttons.
- Check that **Do Not Disturb** mode is off (it can suppress audio on some devices).
- If you're connected to **Bluetooth headphones or a speaker**, audio may be routed there instead of the device speaker.

### 🎧 Audio plays through the wrong output

If audio seems to play but you can't hear it, your device may be routing sound to a Bluetooth device, HDMI display, or AirPlay receiver. Disconnect external audio devices or switch the output in your device's audio settings.

### 🎤 Microphone access was denied

If you accidentally blocked microphone access, the browser remembers your choice and won't ask again. The app needs microphone permission to hear your voice — without it, nothing will work.

**How to re-enable:**

- **Chrome / Edge (desktop)** — click the 🔒 lock (or tune/slider) icon in the address bar → find **Microphone** → change to **Allow** → reload the page.
- **Firefox (desktop)** — click the 🔒 lock icon → **Connection secure** → **More information** → **Permissions** tab → find **Use the Microphone** → remove the block.
- **Safari (Mac)** — Safari menu → **Settings** → **Websites** → **Microphone** → find the site and change to **Allow**.
- **Safari (iPhone / iPad)** — open **Settings** → **Safari** → **Microphone** → set to **Allow** (or **Ask**).
- **Chrome (Android)** — tap the 🔒 lock icon in the address bar → **Permissions** → **Microphone** → change to **Allow**.

## License

This project is open source under the [0BSD License](LICENSE).
