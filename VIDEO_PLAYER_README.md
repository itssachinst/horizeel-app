# Video Player Page

A comprehensive React component for playing short-form HLS videos with smooth transitions, keyboard shortcuts, and mobile-optimized controls.

## Features

### 🎥 Video Playback
- **HLS Support**: Full support for HLS (.m3u8) streams using `hls.js`
- **Fallback Support**: Native HLS support for Safari and regular video files
- **Auto-play**: Intelligent autoplay with muted fallback for browser restrictions
- **Smooth Transitions**: Slide-up transitions between videos using `framer-motion`

### 🎮 Controls & Navigation
- **Back Button**: Top-left navigation to return to previous page
- **Video Title**: Displayed next to the back button
- **View Count & Likes**: Shown below the title with icons
- **Navigation Arrows**: Up/Down arrows for previous/next video (desktop only)
- **Progress Bar**: Custom progress bar with time display
- **Volume Control**: Volume slider and mute toggle (desktop only)
- **Fullscreen**: Toggle fullscreen mode with persistent controls

### 📱 Mobile Optimization
- **Touch Gestures**: Swipe up/down for video navigation
- **Responsive Design**: Optimized layouts for mobile, tablet, and desktop
- **Auto-hide Controls**: Controls fade out during playback, show on interaction
- **Mobile-friendly UI**: Smaller buttons and optimized spacing for touch

### ⌨️ Keyboard Shortcuts
- `Space`: Play/Pause
- `← / →`: Seek backward/forward (10 seconds)
- `↑ / ↓`: Previous/Next video
- `F`: Toggle fullscreen
- `M`: Mute/Unmute
- `L`: Like video
- `D`: Dislike video
- `S`: Save video

### 🎨 UI Elements

#### Top Controls
- Back button with navigation
- Video title (truncated on mobile)
- View count with eye icon
- Like count with thumb up icon

#### Bottom Controls
- **Left**: Uploader avatar and name
- **Center**: Play/pause button
- **Right**: Action buttons (Like, Dislike, Save, Share, Volume, Fullscreen)

#### Progress Bar
- Custom styled progress bar
- Current time and total duration display
- Clickable/draggable for seeking

### 🔄 Transitions
- **Slide-up Animation**: Smooth vertical slide transitions between videos
- **Fade Controls**: Controls fade in/out with smooth animations
- **Spring Physics**: Natural spring animations for video transitions

## Usage

### Basic Implementation
```jsx
import VideoPlayerPage from './pages/VideoPlayerPage';

// Route setup
<Route path="/video-player/:id" element={<VideoPlayerPage />} />
```

### Navigation
```jsx
// Navigate to video player
navigate(`/video-player/${videoId}`);
```

## API Integration

The component expects video data in the following format:

```javascript
{
  video_id: "unique_id",
  title: "Video Title",
  video_url: "https://example.com/video.m3u8", // HLS stream URL
  uploader_id: "user_id",
  uploader_name: "User Name",
  uploader_avatar: "https://example.com/avatar.jpg",
  views: 12500,
  likes: 850,
  dislikes: 23,
  upload_date: "2024-01-15T10:30:00Z",
  duration: 45
}
```

## Dependencies

### Required Packages
- `react` (^19.0.0)
- `react-router-dom` (^7.1.5)
- `framer-motion` (latest)
- `hls.js` (^1.6.1)
- `@mui/material` (^6.4.3)
- `@mui/icons-material` (^6.4.3)

### Custom Hooks
- `useSwipeGestures`: Handles touch gestures for mobile navigation
- `useAuth`: Authentication context for user interactions

### Utilities
- `formatViewCount`: Formats numbers with K/M suffixes
- `formatDuration`: Converts seconds to MM:SS format
- `processVideoUrl`: Processes and validates video URLs

## File Structure

```
src/
├── pages/
│   └── VideoPlayerPage.js          # Main video player component
├── components/
│   └── VideoPlayerControls.js      # Separated controls component
├── hooks/
│   └── useSwipeGestures.js         # Touch gesture handling
└── utils/
    └── videoUtils.js               # Video-related utilities
```

## Browser Support

### Desktop
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Mobile
- iOS Safari 12+
- Chrome Mobile 60+
- Samsung Internet 8+

## Performance Optimizations

### Video Loading
- Lazy loading of video metadata
- Efficient HLS stream handling
- Buffer management for smooth playback

### React Optimizations
- `useCallback` for event handlers
- `useRef` for DOM references
- Proper cleanup of event listeners and timeouts

### Animation Performance
- Hardware-accelerated CSS transforms
- Optimized `framer-motion` configurations
- Minimal re-renders during playback

## Accessibility

### Keyboard Navigation
- Full keyboard support for all functions
- Focus management in fullscreen mode
- Screen reader friendly labels

### Visual Indicators
- High contrast controls
- Clear visual feedback for interactions
- Tooltips for all interactive elements

## Customization

### Styling
The component uses Material-UI's `sx` prop for styling. Key customization points:

```jsx
// Custom colors
const theme = {
  primary: '#ff4444',      // Progress bar and active states
  background: 'black',     // Video background
  controls: 'rgba(0,0,0,0.7)', // Control overlays
};
```

### Transitions
Modify transition settings in the animation variants:

```jsx
const slideVariants = {
  enter: (direction) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  // ... customize timing and easing
};
```

## Error Handling

### Video Loading Errors
- Graceful fallback for unsupported formats
- User-friendly error messages
- Retry mechanisms for network issues

### HLS Stream Errors
- Automatic quality switching
- Buffer recovery
- Fatal error handling with user feedback

## Testing

### Unit Tests
```bash
npm test VideoPlayerPage
```

### Integration Tests
- Video playback functionality
- Keyboard shortcut handling
- Touch gesture recognition
- Fullscreen mode transitions

## Contributing

When contributing to the Video Player Page:

1. Maintain responsive design principles
2. Test on multiple devices and browsers
3. Ensure accessibility compliance
4. Follow the existing code style
5. Add appropriate error handling

## Future Enhancements

### Planned Features
- [ ] Picture-in-picture mode
- [ ] Video quality selection
- [ ] Closed captions support
- [ ] Playlist functionality
- [ ] Video thumbnails preview
- [ ] Advanced gesture controls (pinch to zoom)
- [ ] Chromecast support
- [ ] Offline video caching

### Performance Improvements
- [ ] Video preloading for next/previous videos
- [ ] Adaptive bitrate streaming
- [ ] CDN optimization
- [ ] Service worker caching

## License

This component is part of the Horizeel app and follows the project's licensing terms. 