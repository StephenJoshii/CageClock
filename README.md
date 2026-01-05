# CageClock - Focus Extension

A Chrome Extension built with Plasmo framework (Manifest V3) that helps you stay focused on your chosen topic.

## Features

- 🎯 **Focus Mode Toggle**: Turn focus mode on/off with a sleek toggle switch
- 📝 **Focus Topic**: Set a custom focus topic (e.g., Chess, Coding, Learning)
- 💾 **Persistent Storage**: Settings are saved locally using `chrome.storage.local`
- 🔄 **Background Sync**: Background service worker listens for setting changes

## Project Structure

```
CageClock/
├── src/
│   ├── popup.tsx        # Main popup UI component
│   ├── popup.css        # Popup styles
│   ├── background.ts    # Background service worker
│   └── storage.ts       # Storage utilities and types
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .prettierrc.cjs      # Prettier configuration
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- pnpm, npm, or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder

### Building for Production

```bash
npm run build
```

The production build will be in `build/chrome-mv3-prod`.

## Usage

1. Click on the CageClock extension icon in your browser toolbar
2. Toggle "Focus Mode" on/off using the switch
3. Enter your focus topic (e.g., "Chess", "Coding", "Learning Spanish")
4. Your settings are automatically saved

## Development

The extension uses:
- **Plasmo Framework** - Modern Chrome extension framework
- **React** - UI components
- **TypeScript** - Type safety
- **Chrome Storage API** - Persistent local storage

### Key Files

- `src/popup.tsx` - The popup UI with toggle and input
- `src/background.ts` - Service worker that listens for storage changes
- `src/storage.ts` - Helper functions for reading/writing settings

## License

MIT
