# Echo

Real-time encrypted mesh chat — runs entirely in the browser, no backend required.

---

## What it does

Echo connects users through a shared MQTT broker over WebSockets. Every message is
signed with the sender's Ed25519 key. Direct messages are end-to-end encrypted
(ECDH P-256 key exchange + AES-256-GCM). The broker routes traffic but cannot read
DM content.

## Features

- General room and unlimited direct message chats
- Ed25519 cryptographic identity — generated in your browser, stored in IndexedDB
- End-to-end encryption for DMs (ECDH P-256 + AES-256-GCM)
- TOFU key trust with conflict warnings
- Message signing + verification badges on every message
- Offline delivery via MQTT persistent sessions (QoS 1, `clean: false`)
- Per-chat notification muting, WebAudio beep, OS notifications
- Reactions, pins, replies, edits, and deletes — all broadcast to peers
- Voice notes (MediaRecorder), GIF picker (Tenor), image gallery lightbox
- Disappearing messages and view-once images
- Markdown rendering, @mentions, slash commands, URL preview cards
- Location sharing (OpenStreetMap)
- Progressive Web App — installable, offline-capable, add to home screen
- Dark and light themes

## Quick start

```bash
git clone <repo-url>
cd echo
npm install
cp .env.example .env   # fill in your MQTT broker credentials
npm run dev
```

Open `http://localhost:5173`, enter a username, and start chatting.

## Configuration

Copy `.env.example` to `.env` and set:

```
VITE_MQTT_BROKER_URL=wss://your-broker:8884/mqtt
VITE_MQTT_USERNAME=your-username
VITE_MQTT_PASSWORD=your-password
VITE_LINKPREVIEW_API_KEY=     # optional, for URL preview cards
```

HiveMQ Cloud free tier works out of the box. Create an account at
https://www.hivemq.com/mqtt-cloud-broker/ and use the WebSocket endpoint (port 8884,
path `/mqtt`).

## Build for production

```bash
npm run build    # outputs to dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, Nginx). Requires
HTTPS for PWA features and the Web Notifications API.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Check formatting (Prettier) |
| `npm run format:write` | Apply Prettier formatting |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Watch mode tests |

## Architecture overview

```
Browser
  React app (Vite)
    MqttContext  ──── WebSocket ───► MQTT broker (HiveMQ / Mosquitto)
    IdentityContext (Ed25519 + ECDH, stored in IndexedDB)
    ChatPage (all UI state)
```

No server. No database. No accounts. Identity is your keypair.

## Deep dive

See **GUIDE.md** (gitignored, local only) for a full walkthrough of every system:
crypto identity, E2E encryption, MQTT session mechanics, state management, PWA setup,
deployment checklist, and extension points.

## License

No license specified.
