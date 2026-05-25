# Echo

Real-time mesh chat — runs entirely in the browser, no backend required.

---

## What it does

Echo connects users through a shared MQTT broker over WebSockets (TLS). Pick a
username and start chatting — no account, no install, no server-side code.

## Features

- General room and unlimited direct message chats
- Join / leave notifications — centered gray system messages when users arrive or leave
- Per-chat notification muting, WebAudio beep, OS notifications
- Reactions, pins, replies, edits, and deletes — broadcast to all peers
- Voice notes (MediaRecorder), GIF picker (Tenor), image gallery lightbox
- Disappearing messages and view-once images
- Markdown rendering, @mentions, slash commands, URL preview cards
- Location sharing (OpenStreetMap)
- Drag-and-drop file sharing (images, PDF, docs — up to 10 MB)
- Progressive Web App — installable, add to home screen
- Dark and light themes
- Mobile responsive with iOS safe-area support

## Quick start

```bash
git clone https://github.com/kelyonn/echo.git
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

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages). Requires HTTPS
for PWA features and the Web Notifications API.

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
    MqttContext  ──── WebSocket (TLS) ───► MQTT broker (HiveMQ Cloud)
    ChatPage     (all UI state, message handling)
    ToastContext (notification toasts)
```

Topics used:
- `chat` — general room messages
- `oneToOne/<userA>_<userB>` — direct messages
- `users/<username>/status` — retained presence (join/leave)
- `<topic>/__typing` — ephemeral typing indicators

No server. No database. No accounts. Your username is your identity.

## License

No license specified.
