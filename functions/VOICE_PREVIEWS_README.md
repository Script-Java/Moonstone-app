# Voice Preview Generation Guide

## Why Static Previews?

Instead of generating voice previews on-demand via Cloud Function:
- ✅ **Faster**: Instant playback (no generation wait)
- ✅ **Cheaper**: No Cloud Function costs for previews
- ✅ **Reliable**: No rate limiting or quota issues
- ✅ **Cacheable**: CDN-served static files

## Step 1: Generate Preview Files

### Prerequisites
- Google Cloud credentials with Vertex AI access
- Node.js installed

### Set Credentials (Windows PowerShell)
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\service-account-key.json"
$env:GCLOUD_PROJECT="moonstone-4ffb6"
```

### macOS/Linux
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
export GCLOUD_PROJECT="moonstone-4ffb6"
```

### Run Generation Script
```bash
cd functions
node generate-voice-previews.js
```

This creates `functions/voice-previews/`:
- `kore.mp3`
- `puck.mp3`
- `charon.mp3`
- `fenrir.mp3`
- `aoede.mp3`

## Step 2: Upload to Firebase Storage

### Option A: Firebase Console (Easy)
1. Go to [Firebase Console](https://console.firebase.google.com) > Storage
2. Create folder structure: `public/voice-previews/`
3. Drag and drop all 5 MP3 files

### Option B: CLI (Fast)
```bash
firebase storage:upload voice-previews/kore.mp3 public/voice-previews/kore.mp3
firebase storage:upload voice-previews/puck.mp3 public/voice-previews/puck.mp3
firebase storage:upload voice-previews/charon.mp3 public/voice-previews/charon.mp3
firebase storage:upload voice-previews/fenrir.mp3 public/voice-previews/fenrir.mp3
firebase storage:upload voice-previews/aoede.mp3 public/voice-previews/aoede.mp3
```

## Step 3: Update Storage Rules

Add to `storage.rules`:
```
match /public/voice-previews/{file} {
  allow read: if true;  // Public read access
  allow write: if false; // No public writes
}
```

Deploy:
```bash
firebase deploy --only storage
```

## Step 4: Update preview.ts Function

Replace dynamic generation with static URL serving:

```typescript
export const previewVoice = onCall({ 
    cors: true, 
    memory: "256MiB", // Reduced since we're just returning URLs
    invoker: "public" 
}, async (request) => {
    const { voiceKey } = request.data || {};

    // Validate
    if (!voiceKey || !GEMINI_VOICES[voiceKey as GeminiVoiceKey]) {
        throw new HttpsError(
            "invalid-argument",
            `Invalid voice key. Must be one of: ${Object.keys(GEMINI_VOICES).join(", ")}`
        );
    }

    const bucket = storage.bucket();
    const bucketName = bucket.name;
    const filePath = `public/voice-previews/${voiceKey}.mp3`;

    // Return public URL (no generation needed)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
    
    return { url: publicUrl, cached: true };
});
```

## Benefits

**Before (Dynamic):**
- First call: ~5-10s generation + download
- Rate limits possible
- CPU/memory intensive
- Costs per preview

**After (Static):**
- All calls: <1s (CDN cached)
- No rate limits
- Zero compute
- One-time generation cost

## Regenerating Previews

If you update the preview text or want different recordings:
1. Edit `PREVIEW_TEXT` in `generate-voice-previews.js`
2. Delete old files from Firebase Storage
3. Run script again
4. Upload new files
