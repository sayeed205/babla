# Media Streaming Service

The streaming service provides signed URL management for media playback with automatic refresh, error handling, and retry logic.

## Features

- **Automatic URL Refresh**: URLs are automatically refreshed 5 minutes before expiry
- **Error Handling**: Comprehensive error handling for authentication, network, and API issues
- **Retry Logic**: Exponential backoff retry for failed requests
- **Session Management**: Efficient session management with cleanup
- **React Integration**: Hooks for easy React component integration

## Usage

### Direct Service Usage

```typescript
import { streamingService } from '@/features/media-player'

// Get streaming URL for a movie
const source = await streamingService.getStreamingUrl('movie-id', 'movie')

// Use the source in your media player
player.src = source.url

// Cleanup when done
streamingService.cleanupSession('movie-id', 'movie')
```

### React Hook Usage

```typescript
import { useStreaming } from '@/features/media-player'

function VideoPlayer({ movieId }: { movieId: string }) {
  const { getStreamingUrl, error, isLoading } = useStreaming({
    onError: (error) => console.error('Streaming error:', error),
    onUrlRefresh: (source) => console.log('URL refreshed:', source.url)
  })

  const handlePlay = async () => {
    try {
      const source = await getStreamingUrl(movieId, 'movie')
      // Use source.url in your player
    } catch (error) {
      // Handle error
    }
  }

  return (
    <div>
      <button onClick={handlePlay} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Play'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

### Automatic Media URL Hook

```typescript
import { useMediaStreamingUrl } from '@/features/media-player'

function AutoVideoPlayer({ movieId }: { movieId: string }) {
  const { source, loadStreamingUrl, error, isLoading } = useMediaStreamingUrl(
    movieId,
    'movie',
    {
      onError: (error) => toast.error(error.message),
    }
  )

  useEffect(() => {
    if (movieId) {
      loadStreamingUrl()
    }
  }, [movieId, loadStreamingUrl])

  if (isLoading) return <div>Loading stream...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!source) return <div>No stream available</div>

  return <video src={source.url} controls />
}
```

## Error Handling

The service provides comprehensive error handling with specific error codes:

- `URL_FETCH_FAILED`: Failed to fetch initial signed URL
- `URL_REFRESH_FAILED`: Failed to refresh expired URL
- `REFRESH_IN_PROGRESS`: Attempted concurrent refresh
- `AUTH_FAILED`: Authentication error (401)
- `API_ERROR`: General API error
- `UNSUPPORTED_MEDIA_TYPE`: Media type not supported
- `NETWORK_ERROR`: Network connectivity issues
- `TIMEOUT_ERROR`: Request timeout

## Configuration

The service uses the following default configuration:

```typescript
{
  autoRefreshBuffer: 300, // Refresh 5 minutes before expiry
  maxRetries: 3,          // Maximum retry attempts
  retryDelay: 1000,       // Base delay (1 second) for exponential backoff
}
```

## Session Management

The service automatically manages streaming sessions:

- **Automatic Cleanup**: Sessions are cleaned up when URLs expire
- **Timer Management**: Refresh timers are properly managed and cleaned up
- **Memory Efficiency**: No memory leaks from abandoned sessions

## Integration with Backend

The service integrates with the existing backend API:

- Uses `/movies/{id}/stream-url` endpoint for signed URLs
- Handles the response format with `streamUrl`, `expiresAt`, `size`, etc.
- Respects authentication via the existing API client middleware
- Supports the signed URL format with expires and signature parameters
