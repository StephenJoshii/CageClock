# CageClock Testing Guide

## Quick Start

1. **Build the extension**:

   ```bash
   yarn build
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `build/chrome-mv3-prod` folder

3. **Get YouTube API Key** (if not already configured):
   - Go to https://console.cloud.google.com/apis/credentials
   - Create API key
   - Click CageClock extension icon → API Settings → Save API Key

---

## Test Cases

### 1. Focus Mode Toggle ✅

**Steps**:

1. Open YouTube (www.youtube.com)
2. Click CageClock extension icon
3. Toggle Focus Mode ON
4. Set a topic (e.g., "Chess")
5. Click extension icon again to verify state

**Expected Results**:

- [ ] Toggle switch shows ON state (blue)
- [ ] Status shows "Focusing"
- [ ] Topic chip appears
- [ ] Home page shows curated videos
- [ ] Default YouTube feed is hidden
- [ ] Console shows: "🎯 Focus mode ENABLED"

**Toggle OFF**:

- [ ] Toggle switch shows OFF state (gray)
- [ ] Page reloads automatically
- [ ] Normal YouTube homepage returns

---

### 2. Topic Management ✅

**Steps**:

1. Open extension popup
2. Type "Python tutorials" in input field
3. Press Enter
4. Type "React Hooks" in input field
5. Press Enter
6. Click "x" on "Python tutorials" chip

**Expected Results**:

- [ ] New topic chips appear with spring animation
- [ ] Both topics display as comma-separated in status
- [ ] Removing a chip works immediately
- [ ] Input field clears after adding topic
- [ ] Backspace on empty input removes last chip

---

### 3. Redirect Blocking ✅

**Steps**:

1. Enable Focus Mode
2. Try to navigate to: https://www.youtube.com/feed/trending
3. Try to navigate to: https://www.youtube.com/gaming
4. Try to navigate to: https://www.youtube.com/feed/explore
5. Try to navigate to: https://www.youtube.com/shorts

**Expected Results**:

- [ ] Orange banner appears at top
- [ ] Message: "🚫 This page is blocked during focus mode"
- [ ] "Go Home" button is visible
- [ ] Auto-redirects to https://www.youtube.com after 2 seconds
- [ ] Console shows: "[CageClock Redirect] Blocking navigation to: /feed/trending"

**Control Test** (Focus Mode OFF):

- [ ] Navigate to /feed/trending - should NOT be blocked
- [ ] Pages load normally

---

### 4. Video Filtering ✅

**Steps**:

1. Set topic to something with Shorts (e.g., "Music")
2. Enable Focus Mode
3. Open console (F12)
4. Watch for filter logs

**Expected Results**:

- [ ] Console shows: "[YouTube API] Filtered out Short: ..."
- [ ] Console shows: "[YouTube API] Filtered out Music: ..."
- [ ] Console shows: "Filtered X videos" count
- [ ] No Shorts (< 60s) appear in feed
- [ ] No Music videos appear in feed
- [ ] Popup "Videos Filtered Today" count increases

**Check Popup**:

- [ ] Click extension icon
- [ ] "Videos Filtered Today" shows number > 0

---

### 5. Statistics Tracking ✅

**Steps**:

1. Enable Focus Mode with a topic
2. Wait for videos to load (may filter some)
3. Click extension icon to check stats
4. Reload YouTube
5. Filter more videos
6. Check stats again

**Expected Results**:

- [ ] Initial stats show filtered count
- [ ] Stats persist across page reloads
- [ ] Count increases after each page load
- [ ] No console errors about statistics
- [ ] Stats don't reset unexpectedly (only after 24 hours)

---

### 6. Early CSS (No Flicker) ✅

**Steps**:

1. Disable Focus Mode
2. Close YouTube tab
3. Open new YouTube tab (www.youtube.com)
4. Enable Focus Mode from popup
5. Reload page with Ctrl+R
6. Watch for white screen flash

**Expected Results**:

- [ ] No white screen flash when loading
- [ ] Home feed hidden immediately (not briefly visible)
- [ ] Content loads smoothly
- [ ] Console: "[CageClock] Early hide CSS injected"

---

### 7. Break Mode ✅

**Steps**:

1. Enable Focus Mode
2. Click "Emergency Exit (10 min break)" button
3. Wait for timer to tick down
4. Click "End Break Early" (optional)
5. Wait for automatic re-enable

**Expected Results**:

- [ ] Break panel shows with ☕ icon
- [ ] Timer counts down (e.g., "9:59")
- [ ] Status shows "Break Mode Active"
- [ ] Focus mode toggles OFF
- [ ] After 10 min (or early end), focus mode re-enables
- [ ] Console: "☕ Break mode ENDED - resuming focus"

---

### 8. API Key Management ✅

**Steps**:

1. Click "API Settings" button in popup
2. Enter a test API key (or invalid key)
3. Click "Save API Key"
4. Check status message

**Expected Results**:

- [ ] Settings panel expands
- [ ] API key field shows as password (•••••)
- [ ] "Save API Key" button is blue
- [ ] Success message: "✓ API key saved!"
- [ ] Status updates to "✓ Configured"
- [ ] Link to Google Cloud Console is clickable

**Test Invalid Key**:

- [ ] Enter invalid key
- [ ] Try to load videos
- [ ] Error message appears: "YouTube API key not configured..."

---

### 9. Algorithm Nudge ✅

**Steps**:

1. Enable Focus Mode with topic
2. Open console
3. Wait 30 minutes (or simulate by changing alarm in background.ts temporarily)

**Expected Results**:

- [ ] Console: "[AlgorithmNudge] Started - will nudge every 30 minutes"
- [ ] Console: "[AlgorithmNudge] Nudging algorithm with topic: '...'"
- [ ] Console: "[AlgorithmNudge] Found X videos for '...'"

---

### 10. Cache Management ✅

**Steps**:

1. Enable Focus Mode with topic
2. Load videos
3. Reload page (should use cache)
4. Click refresh ↻ button in video feed

**Expected Results**:

- [ ] First load: "[CageClock] Fetching fresh videos..."
- [ ] Reload: "[CageClock] Using cached videos (Xs old)"
- [ ] Refresh button triggers fresh fetch
- [ ] Cache expires after 30 minutes
- [ ] Console shows cache timing

---

### 11. Responsive Design ✅

**Steps**:

1. Open YouTube with Focus Mode
2. Resize browser window to:
   - 1920px width (desktop)
   - 1280px width (laptop)
   - 768px width (tablet)
   - 375px width (mobile)

**Expected Results**:

- [ ] 1920px: 4 columns of videos
- [ ] 1280px: 3 columns of videos
- [ ] 768px: 2 columns of videos
- [ ] 375px: 1 column of videos
- [ ] No horizontal scrollbars
- [ ] Videos fit screen width

---

### 12. Dark/Light Mode ✅

**Steps**:

1. Open YouTube in Dark mode (default)
2. Check extension colors
3. Switch YouTube to Light mode (account → appearance)
4. Check extension colors

**Expected Results**:

- [ ] Dark mode: Background #0f0f0f, text #f1f1f1
- [ ] Light mode: Background #ffffff, text #0f0f0f
- [ ] Colors match YouTube theme
- [ ] No readability issues in either mode
- [ ] Toggle/switch colors update correctly

---

## Edge Cases

### Empty Topic

- [ ] Enable Focus Mode without topic
- [ ] Shows: "🎯 No focus topic set"
- [ ] Message: "Click CageClock extension icon to set topic"

### No Videos Found

- [ ] Set topic to something obscure
- [ ] Shows: "📭 No videos found for '...'"
- [ ] Hint: "Try a different focus topic"

### Network Error

- [ ] Disable internet connection
- [ ] Try to load videos
- [ ] Error message appears in feed
- [ ] Console shows error type

### API Quota Exceeded

- [ ] Exhaust API quota (use test key)
- [ ] Try to load videos
- [ ] Error: "YouTube API quota exceeded"
- [ ] Helpful message about reset time

---

## Performance Tests

### Memory

- [ ] Open YouTube with 100+ videos loaded
- [ ] Check Chrome Task Manager (Shift+Esc)
- [ ] Extension memory usage < 50MB

### Load Time

- [ ] Time from page load to first video visible < 2s
- [ ] Time to full feed load < 5s
- [ ] No layout shifts during loading

### Smooth Animations

- [ ] Video cards fade in smoothly
- [ ] Hover effects are 60fps
- [ ] No stuttering on scroll

---

## Console Errors Checklist

After running all tests, check console for errors:

- [ ] No red errors
- [ ] No unhandled promise rejections
- [ ] No TypeScript type errors in console
- [ ] All logs are informative (not spammy)

---

## Success Criteria

✅ All critical tests pass (1-10)
✅ All edge cases handled properly
✅ No console errors
✅ Performance acceptable
✅ UI matches YouTube design
✅ Extension works after Chrome restart
✅ Extension works after system sleep

---

## Reporting Bugs

If you find issues, report:

1. **Reproduction steps** (exact clicks/navigation)
2. **Expected behavior**
3. **Actual behavior**
4. **Console errors** (screenshot or copy-paste)
5. **Browser version** (Chrome version)
6. **Extension version** (from package.json)

Example:

```
Issue: Redirect not working for /shorts

Steps:
1. Enable Focus Mode
2. Navigate to /shorts
3. Page loads normally (should be blocked)

Expected: Redirect banner and auto-redirect to home
Actual: /shorts page loads

Console:
[CageClock Redirect] Navigation to: /shorts
(no further logs)

Browser: Chrome 120.0.6099.109
Extension: 0.0.1
```
