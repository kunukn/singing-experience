# <picture><source media="(prefers-color-scheme: dark)" srcset="public/icons/note-inverted.svg"><img src="public/icons/note.svg" width="32" height="32" alt="music note" /></picture> Singing Experience

A fun, browser-based singing practice app. Use your microphone to see what note you're singing in real time — or play a game where you sing through the musical scale.

## What Is This?

Singing Experience is a small web app that listens to your voice through your device's microphone and tells you what musical note you're singing. It's designed for anyone who wants to explore their voice, warm up before singing, or just have fun with music — no musical training required.

## Features

### 🎤 Pitch Detector

Sing or hum into your microphone and instantly see:

- The **note** you're singing (like C, D, E, etc.)
- How **in-tune** you are (are you a little sharp or flat?)
- The **frequency** of your voice in real time

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

## License

This project is open source under the [0BSD License](LICENSE).
