# Backend HLS Streaming Setup Guide

## 🎯 What This Does

When you start a stream, the backend **automatically generates an HLS URL** that mobile apps can use. No manual work needed!

## ✅ What's Already Done

- ✅ Node Media Server installed
- ✅ Media server service created
- ✅ Auto-generate HLS URLs on stream start
- ✅ HLS URL included in all API responses

## 📋 What You Need to Do (3 Steps)

### Step 1: Install FFmpeg

**Windows:**
1. Download: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to Windows PATH:
   - Open System Properties → Environment Variables
   - Edit PATH variable
   - Add `C:\ffmpeg\bin`
4. Verify: Open new CMD window and type `ffmpeg -version`

**macOS:**
```bash
brew install ffmpeg
ffmpeg -version  # Verify
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
ffmpeg -version  # Verify
```

### Step 2: Add Environment Variables

Add to your `.env` file:

```env
# Media Server Configuration
MEDIA_SERVER_URL=http://localhost:8000
RTMP_PORT=1935
MEDIA_SERVER_HTTP_PORT=8000
```

**For Production (Render/Heroku/etc.):**
```env
MEDIA_SERVER_URL=https://your-backend.onrender.com:8000
RTMP_HOST=your-backend.onrender.com
```

### Step 3: Restart Server

```bash
npm start
```

**Check logs for:**
```
✅ Media Server initialized - HLS streaming enabled
```

If you see a warning about FFmpeg, install it (Step 1).

## 🎉 How It Works

### When You Start a Stream:

1. **Call:** `POST /api/v1/admin/streams/{competitionId}/start`

2. **Backend automatically:**
   - Creates WebRTC room (for web viewers)
   - Generates HLS URL: `http://localhost:8000/live/{competitionId}/index.m3u8`
   - Stores it in `hls_stream_url` field

3. **Response includes:**
   ```json
   {
     "hls_url": "http://localhost:8000/live/.../index.m3u8",
     "rtmp_url": "rtmp://localhost:1935/live/...",
     "live_draw_watching_url": "http://localhost:5000/stream/..."
   }
   ```

4. **`/competitions/recent` automatically includes:**
   ```json
   {
     "hls_stream_url": "http://localhost:8000/live/.../index.m3u8",
     "live_draw_watching_url": "http://localhost:5000/stream/..."
   }
   ```

## 🎥 How to Actually Stream Video

### Option 1: OBS Studio (Recommended)

1. **Download OBS:** https://obsproject.com/
2. **Configure:**
   - Settings → Stream
   - Service: **Custom**
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `{competitionId}` (e.g., `5db659ed-207b-47d5-9fcf-cdcb20a5b486`)
3. **Start Streaming** in OBS

HLS will be available at: `http://localhost:8000/live/{competitionId}/index.m3u8`

### Option 2: FFmpeg Command Line

```bash
ffmpeg -re -i your-video.mp4 -c copy -f flv rtmp://localhost:1935/live/competition-id
```

## 🧪 Testing

### 1. Verify Setup

```bash
# Check FFmpeg
ffmpeg -version

# Start server
npm start

# Check logs for "Media Server initialized"
```

### 2. Start a Stream

```bash
POST /api/v1/admin/streams/{competitionId}/start
```

**Response should include `hls_url`**

### 3. Check Competition Data

```bash
GET /competitions/recent
```

**Should show `hls_stream_url` in response**

### 4. Test HLS Playback

Open in browser or VLC:
```
http://localhost:8000/live/{competitionId}/index.m3u8
```

## ⚠️ Troubleshooting

### "FFmpeg not found"
- Install FFmpeg (Step 1)
- Or set `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe` in `.env`

### "Port already in use"
- Change ports in `.env`:
  ```env
  RTMP_PORT=1936
  MEDIA_SERVER_HTTP_PORT=8001
  ```

### "HLS URL not in response"
- Check media server initialized in logs
- Verify FFmpeg is installed
- Check environment variables are set

### "Can't access HLS from mobile"
- Use HTTPS in production
- Set `MEDIA_SERVER_URL` to your public domain
- CORS is already enabled

## 📊 Architecture

```
Admin Streams → RTMP (port 1935) → Node Media Server → HLS (port 8000) → Mobile App
                                    ↓
                              FFmpeg converts
                              RTMP to HLS
```

## ✅ Checklist

- [ ] Install FFmpeg
- [ ] Add environment variables to `.env`
- [ ] Restart server
- [ ] Verify "Media Server initialized" in logs
- [ ] Start a test stream
- [ ] Verify `hls_stream_url` in response
- [ ] Test with OBS or FFmpeg

## 🎊 Result

Once you complete the 3 steps, **HLS URLs are automatically generated** every time you start a stream!

The mobile team can use `hls_stream_url` directly - no additional work needed! 🚀

