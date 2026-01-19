# CageClock - Focus Extension for YouTube

A Chrome extension that helps you stay focused on a specific topic while browsing YouTube. Instead of getting lost in endless recommendations, CageClock hides distracting content and shows you curated videos related to your chosen focus topic.

## Features

- **Focus Mode Toggle**: Enable or disable focus mode with a single click
- **Custom Focus Topic**: Set any topic you want to learn about (e.g., Chess, Coding, Math)
- **Distraction Blocking**: Hides YouTube's home feed, sidebar recommendations, Shorts, and end-screen suggestions
- **Curated Learning Feed**: Displays relevant videos for your focus topic using YouTube Data API
- **Algorithm Nudge**: Periodically searches for your topic in the background to influence YouTube's recommendations
- **Redirector**: Automatically redirects you away from Trending, Gaming, Explore, and Shorts pages
- **Emergency Exit**: Take a 10-minute break when you need it - focus mode automatically resumes after

## Installation

### Prerequisites

- Node.js (v18 or higher)
- Yarn or npm
- A YouTube Data API v3 key (see below)

### Getting a YouTube API Key

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the "YouTube Data API v3" from the API Library
4. Go to "Credentials" and click "Create Credentials" then "API Key"
5. Copy the API key - you will need it to configure the extension

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/StephenJoshii/CageClock.git
   cd CageClock
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Start the development server:

   ```bash
   yarn dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to chrome://extensions/
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder from the project directory

### Production Build

To create a production build:

```bash
yarn build
```

The built extension will be in `build/chrome-mv3-prod`.

## Usage

1. **Configure API Key**: Click the CageClock extension icon, open "API Settings", and enter your YouTube API key

2. **Set Focus Topic**: Enter the topic you want to focus on (e.g., "Chess openings", "JavaScript tutorials", "Machine learning")

3. **Enable Focus Mode**: Toggle the switch to ON

4. **Browse YouTube**:
   - The home page will show curated videos for your topic
   - Distracting elements (sidebar, Shorts, recommendations) are hidden
   - Attempting to visit Trending, Gaming, or Shorts will redirect you home

5. **Take a Break**: Click "Emergency Exit" for a 10-minute break where focus mode is disabled

## How It Works

### Content Hiding

When focus mode is enabled, CSS is injected to hide:

- Home page video grid
- Sidebar recommendations on video pages
- Category chips
- Shorts shelves
- End screen recommendations
- Video cards

### Learning Feed

The extension fetches videos from YouTube Data API based on your focus topic and displays them in a clean grid layout that matches YouTube's design.

### Algorithm Nudge

Every 30 minutes, the extension performs a background search for your focus topic. This helps train YouTube's recommendation algorithm to show more relevant content over time.

### Redirector

Navigation to these paths is blocked when focus mode is active:

- /feed/trending
- /gaming
- /feed/explore
- /shorts

## Project Structure

```
CageClock/
├── src/
│   ├── background.ts        # Service worker for message handling and alarms
│   ├── popup.tsx            # Extension popup UI
│   ├── popup.css            # Popup styles
│   ├── storage.ts           # Storage keys and helper functions
│   ├── youtube-api.ts       # YouTube Data API integration
│   ├── contents/
│   │   ├── youtube.tsx      # Main content script for YouTube
│   │   └── youtube-early.ts # Early CSS injection to prevent flicker
│   └── components/
│       ├── FocusFeed.tsx    # Video card components
│       └── FocusFeed.css    # Video card styles
├── package.json
└── tsconfig.json
```

## Tech Stack

- **Plasmo Framework**: Chrome extension development framework
- **React 18**: UI components
- **TypeScript**: Type-safe JavaScript
- **Chrome Extension Manifest V3**: Modern extension architecture
- **YouTube Data API v3**: Video search and metadata

## Configuration

### Storage Keys

The extension uses chrome.storage.local for persistence:

| Key           | Description               |
| ------------- | ------------------------- |
| isEnabled     | Focus mode on/off state   |
| focusTopic    | Current focus topic       |
| youtubeApiKey | YouTube API key           |
| breakMode     | Break mode state          |
| breakEndTime  | Timestamp when break ends |

### Permissions

The extension requires these permissions:

- storage: Save settings locally
- alarms: Schedule algorithm nudge and break timer
- Host permissions for youtube.com and googleapis.com

## Troubleshooting

### Videos not loading

1. Check that your YouTube API key is configured correctly
2. Verify the API key has YouTube Data API v3 enabled
3. Check if you have exceeded your daily API quota (resets at midnight PT)

### Focus mode not working

1. Make sure the extension is enabled in chrome://extensions/
2. Refresh the YouTube page after enabling focus mode
3. Check the browser console for any error messages

### Redirect loop

If you experience a redirect loop, disable the extension temporarily from chrome://extensions/ and clear the extension's storage.

## API Quota

The YouTube Data API has a daily quota limit (10,000 units by default). Each search request costs 100 units. The extension caches results for 30 minutes to minimize API usage.

## License

MIT License

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.
