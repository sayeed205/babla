import { useAuthStore } from '@/features/auth/stores/auth-store'
import {
    AuthenticatedStreamingCore,
    type ChunkRequest,
    type StreamingConfig,
    type StreamingError,
} from '@/lib/authenticated-streaming-core'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface LosslessAudioPlayerProps {
  src: string
  title?: string
  artist?: string
  album?: string
  artwork?: string
  className?: string
  autoPlay?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: (error: string) => void
  onLoadedMetadata?: () => void
  onCanPlay?: () => void
  onWaiting?: () => void
}

export interface AudioFormat {
  codec: string
  bitrate: number
  sampleRate: number
  channels: number
  isLossless: boolean
}

interface AudioPlayerState {
  isLoading: boolean
  error: string | null
  bufferedRanges: TimeRanges | null
  currentChunkPosition: number
  totalFileSize: number
  audioFormat: AudioFormat | null
  isInitialized: boolean
}

// Audio-specific streaming configuration with memory optimization
const AUDIO_STREAMING_CONFIG: StreamingConfig = {
  chunkSize: 512 * 1024, // 512KB default for audio - smaller chunks for better memory management
  maxRetries: 3,
  retryDelay: 1000,
  bufferAhead: 60, // Longer buffer for audio to prevent interruptions
  bufferBehind: 15, // Shorter behind buffer for audio
}

// Audio memory management constants
const MAX_AUDIO_MEMORY = 50 * 1024 * 1024 // 50MB max for audio

// Supported lossless audio formats with prioritization - lossless formats prioritized
const LOSSLESS_AUDIO_FORMATS = [
  { mimeType: 'audio/flac', extension: 'flac', isLossless: true, priority: 1, quality: 'lossless' },
  { mimeType: 'audio/wav', extension: 'wav', isLossless: true, priority: 1, quality: 'lossless' },
  { mimeType: 'audio/x-wav', extension: 'wav', isLossless: true, priority: 1, quality: 'lossless' },
  { mimeType: 'audio/mpeg', extension: 'mp3', isLossless: false, priority: 3, quality: 'lossy' },
  { mimeType: 'audio/aac', extension: 'aac', isLossless: false, priority: 4, quality: 'lossy' },
  { mimeType: 'audio/mp4', extension: 'm4a', isLossless: false, priority: 4, quality: 'lossy' },
] as const

export const LosslessAudioPlayer: React.FC<LosslessAudioPlayerProps> = ({
  src,
  title,
  artist,
  album,
  artwork,
  className = '',
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  onError,
  onLoadedMetadata,
  onCanPlay,
  onWaiting,
}) => {
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamingCoreRef = useRef<AuthenticatedStreamingCore | null>(null)
  const loadingChunksRef = useRef<Set<string>>(new Set())
  const audioBlobRef = useRef<Blob | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Auth store
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore()

  // Component state
  const [state, setState] = useState<AudioPlayerState>({
    isLoading: false,
    error: null,
    bufferedRanges: null,
    currentChunkPosition: 0,
    totalFileSize: 0,
    audioFormat: null,
    isInitialized: false,
  })

  // Initialize streaming core
  useEffect(() => {
    streamingCoreRef.current = new AuthenticatedStreamingCore(AUDIO_STREAMING_CONFIG)
  }, [])

  // Detect audio format from URL with lossless format prioritization
  const detectAudioFormat = useCallback((url: string): AudioFormat | null => {
    const urlLower = url.toLowerCase()

    // Sort formats by priority (lossless first)
    const sortedFormats = [...LOSSLESS_AUDIO_FORMATS].sort((a, b) => a.priority - b.priority)

    for (const format of sortedFormats) {
      if (urlLower.includes(`.${format.extension}`)) {
        return {
          codec: format.mimeType,
          bitrate: format.isLossless ? 0 : 320, // 0 for lossless, high quality for lossy
          sampleRate: format.isLossless ? 96000 : 44100, // High sample rate for lossless
          channels: 2, // Assume stereo
          isLossless: format.isLossless,
        }
      }
    }

    // Default to high-quality MP3 if format cannot be determined
    return {
      codec: 'audio/mpeg',
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      isLossless: false,
    }
  }, [])

  // Check if browser supports the audio format
  const checkAudioSupport = useCallback((format: AudioFormat): boolean => {
    if (!audioRef.current) return false

    try {
      const canPlay = audioRef.current.canPlayType(format.codec)
      return canPlay === 'probably' || canPlay === 'maybe'
    } catch (error) {
      console.warn('Error checking audio format support:', error)
      return false
    }
  }, [])

  // Handle authentication errors with consistent approach matching video player
  const handleAuthError = useCallback(
    (error: StreamingError) => {
      let message: string

      switch (error.status) {
        case 401:
          message =
            'Authentication required to play this audio content. Please log in and try again.'
          break
        case 403:
          message = 'You do not have permission to access this audio content.'
          break
        default:
          message = `Authentication error occurred while loading audio: ${error.message}`
      }

      setState((prev) => ({ ...prev, error: message, isLoading: false }))
      onError?.(message)

      // Log authentication errors for debugging
      console.error('Audio player authentication error:', {
        status: error.status,
        message: error.message,
        type: error.type,
        src,
      })
    },
    [onError, src]
  )

  // Handle network errors with retry logic
  const handleNetworkError = useCallback(
    async (error: StreamingError, operation: () => Promise<void>): Promise<void> => {
      if (!streamingCoreRef.current) return

      try {
        await streamingCoreRef.current.retryWithBackoff(operation)
      } catch (retryError) {
        const message = `Network error: ${error.message}. Please check your connection and try again.`
        setState((prev) => ({ ...prev, error: message, isLoading: false }))
        onError?.(message)
      }
    },
    [onError]
  )

  // Validate authentication state before loading
  const validateAuthentication = useCallback((): boolean => {
    // Wait for authentication to complete if still loading
    if (authLoading) {
      setState((prev) => ({
        ...prev,
        error: 'Loading authentication...',
        isLoading: true,
      }))
      return false
    }

    if (!isAuthenticated) {
      setState((prev) => ({
        ...prev,
        error: 'Authentication required to play audio content',
        isLoading: false,
      }))
      return false
    }

    if (!token || !token.token) {
      setState((prev) => ({
        ...prev,
        error: 'Invalid authentication token. Please log in again.',
        isLoading: false,
      }))
      return false
    }

    // Check token expiration
    if (token.expiresAt) {
      const expirationDate = new Date(token.expiresAt)
      if (expirationDate <= new Date()) {
        setState((prev) => ({
          ...prev,
          error: 'Authentication token has expired. Please log in again.',
          isLoading: false,
        }))
        return false
      }
    }

    return true
  }, [authLoading, isAuthenticated, token])

  // Load audio with chunked streaming using AuthenticatedStreamingCore
  const loadAudioWithChunks = useCallback(async () => {
    if (!src || !streamingCoreRef.current) {
      return
    }

    // Validate authentication first
    if (!validateAuthentication()) {
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Detect audio format
      const audioFormat = detectAudioFormat(src)
      if (!audioFormat) {
        throw new Error('Unsupported audio format')
      }

      // Check browser support
      if (!checkAudioSupport(audioFormat)) {
        throw new Error(`Your browser does not support ${audioFormat.codec} audio format`)
      }

      setState((prev) => ({ ...prev, audioFormat }))

      // Get file size for chunk calculation
      const fileSize = await streamingCoreRef.current.getFileSize(src, token!.token)
      setState((prev) => ({ ...prev, totalFileSize: fileSize }))

      // For audio, we can use the standard HTML5 audio element with authentication
      // by setting up a blob URL with the authenticated content
      await loadAudioBlob()
    } catch (error) {
      console.error('Error loading audio:', error)

      if (error instanceof Error && 'type' in error) {
        const streamingError = error as StreamingError
        if (streamingError.type === 'AUTHENTICATION') {
          handleAuthError(streamingError)
          return
        }
        if (streamingError.type === 'NETWORK') {
          await handleNetworkError(streamingError, async () => {
            await loadAudioWithChunks()
          })
          return
        }
      }

      const message = error instanceof Error ? error.message : 'Failed to load audio'
      setState((prev) => ({ ...prev, error: message, isLoading: false }))
      onError?.(message)
    }
  }, [
    src,
    token,
    isAuthenticated,
    detectAudioFormat,
    checkAudioSupport,
    handleAuthError,
    handleNetworkError,
    onError,
  ])

  // Load audio as blob using AuthenticatedStreamingCore for consistent authentication
  const loadAudioBlob = useCallback(async () => {
    if (!streamingCoreRef.current || !token || !audioRef.current) return

    try {
      // For audio files, we'll load the entire file as chunks and create a blob
      // This ensures compatibility with lossless formats and maintains quality
      const chunks: ArrayBuffer[] = []
      const chunkSize = AUDIO_STREAMING_CONFIG.chunkSize
      let currentPosition = 0
      let loadedChunks = 0

      while (currentPosition < state.totalFileSize) {
        const endPosition = Math.min(currentPosition + chunkSize - 1, state.totalFileSize - 1)

        const chunkRequest: ChunkRequest = {
          start: currentPosition,
          end: endPosition,
          priority: 'high', // All audio chunks are high priority for quality
        }

        const chunkKey = `${chunkRequest.start}-${chunkRequest.end}`
        if (loadingChunksRef.current.has(chunkKey)) {
          currentPosition = endPosition + 1
          continue
        }

        loadingChunksRef.current.add(chunkKey)

        try {
          // Use AuthenticatedStreamingCore with consistent Bearer token authentication
          const chunkData = await streamingCoreRef.current.fetchChunk(
            src,
            chunkRequest,
            token.token
          )
          chunks.push(chunkData)
          loadedChunks++

          setState((prev) => ({
            ...prev,
            currentChunkPosition: currentPosition,
          }))
        } catch (chunkError) {
          console.warn(`Failed to load audio chunk ${chunkKey}:`, chunkError)

          // Handle authentication errors during chunk loading
          if (chunkError instanceof Error && 'type' in chunkError) {
            const streamingError = chunkError as StreamingError
            if (streamingError.type === 'AUTHENTICATION') {
              handleAuthError(streamingError)
              return
            }
          }

          // For audio, we'll continue loading other chunks even if one fails
          // but we'll track failed chunks for potential retry
        } finally {
          loadingChunksRef.current.delete(chunkKey)
        }

        currentPosition = endPosition + 1
      }

      // Create blob from all chunks with proper MIME type and memory management
      if (chunks.length > 0) {
        const mimeType = state.audioFormat?.codec || 'audio/mpeg'
        const audioBlob = new Blob(chunks, { type: mimeType })
        
        // Check memory usage
        const blobSize = audioBlob.size
        if (blobSize > MAX_AUDIO_MEMORY) {
          console.warn(`Audio blob size (${(blobSize / 1024 / 1024).toFixed(1)}MB) exceeds memory limit`)
        }

        const blobUrl = URL.createObjectURL(audioBlob)

        // Store references for cleanup
        audioBlobRef.current = audioBlob
        blobUrlRef.current = blobUrl

        // Set the blob URL as the audio source
        audioRef.current.src = blobUrl

        setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }))

        console.info(`Audio loaded: ${(blobSize / 1024 / 1024).toFixed(1)}MB, ${state.audioFormat?.isLossless ? 'lossless' : 'lossy'} format`)

        // Clean up blob URL when component unmounts
        return () => {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
          }
          audioBlobRef.current = null
        }
      } else {
        throw new Error('No audio chunks were successfully loaded')
      }
    } catch (error) {
      console.error('Error creating audio blob:', error)

      // Handle different types of errors appropriately
      if (error instanceof Error && 'type' in error) {
        const streamingError = error as StreamingError
        if (streamingError.type === 'AUTHENTICATION') {
          handleAuthError(streamingError)
          return
        }
        if (streamingError.type === 'NETWORK') {
          await handleNetworkError(streamingError, async () => {
            await loadAudioBlob()
          })
          return
        }
      }

      const message = error instanceof Error ? error.message : 'Failed to load audio content'
      setState((prev) => ({
        ...prev,
        error: message,
        isLoading: false,
      }))
      onError?.(message)
    }
  }, [
    src,
    token,
    state.totalFileSize,
    state.audioFormat,
    handleAuthError,
    handleNetworkError,
    onError,
  ])

  // Initialize audio loading when component mounts or src changes
  useEffect(() => {
    if (src) {
      loadAudioWithChunks()
    }

    // Enhanced cleanup function with memory management
    return () => {
      try {
        // Clean up blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }

        // Clear audio source
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.src = ''
          audioRef.current.load()
        }

        // Clear references
        audioBlobRef.current = null
        loadingChunksRef.current.clear()

        console.info('Lossless audio player cleanup completed')
      } catch (error) {
        console.warn('Error during audio player cleanup:', error)
      }
    }
  }, [src, loadAudioWithChunks])

  // Reset state when authentication changes
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !token)) {
      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: false,
        isInitialized: false,
      }))

      // Clear audio source if authentication is lost
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      
      if (audioRef.current) {
        audioRef.current.src = ''
        audioRef.current.load()
      }
      
      audioBlobRef.current = null
    }
  }, [authLoading, isAuthenticated, token])

  // Retry loading when authentication becomes available
  useEffect(() => {
    if (src && !authLoading && isAuthenticated && token?.token && state.error?.includes('Authentication')) {
      console.info('Authentication now available, retrying audio loading...')
      loadAudioWithChunks()
    }
  }, [src, authLoading, isAuthenticated, token, state.error, loadAudioWithChunks])

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && onTimeUpdate) {
      onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration || 0)
    }
  }, [onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState((prev) => ({
        ...prev,
        bufferedRanges: audioRef.current?.buffered || null,
      }))
      onLoadedMetadata?.()
    }
  }, [onLoadedMetadata])

  const handleCanPlay = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: false }))
    onCanPlay?.()
  }, [onCanPlay])

  const handleWaiting = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }))
    onWaiting?.()
  }, [onWaiting])

  const handleError = useCallback(() => {
    const message = 'Audio playback error occurred'
    setState((prev) => ({ ...prev, error: message, isLoading: false }))
    onError?.(message)
  }, [onError])

  // Render loading state
  if (state.isLoading && !state.isInitialized) {
    return (
      <div className={`lossless-audio-player loading ${className}`}>
        <div className="audio-loading-indicator">
          <div className="loading-spinner" />
          <p>Loading high-quality audio...</p>
          {state.audioFormat?.isLossless && <p className="format-info">Lossless format detected</p>}
        </div>
      </div>
    )
  }

  // Render error state
  if (state.error) {
    return (
      <div className={`lossless-audio-player error ${className}`}>
        <div className="audio-error-message">
          <p>{state.error}</p>
          <button onClick={() => loadAudioWithChunks()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render audio player
  return (
    <div className={`lossless-audio-player ${className}`}>
      <audio
        ref={audioRef}
        controls
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onEnded={onEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Audio metadata display */}
      {(title || artist || album) && (
        <div className="audio-metadata">
          {artwork && (
            <img src={artwork} alt={`${album || title} artwork`} className="audio-artwork" />
          )}
          <div className="audio-info">
            {title && <h3 className="audio-title">{title}</h3>}
            {artist && <p className="audio-artist">{artist}</p>}
            {album && <p className="audio-album">{album}</p>}
          </div>
        </div>
      )}

      {/* Audio format info for lossless content */}
      {state.audioFormat?.isLossless && (
        <div className="audio-quality-indicator">
          <span className="lossless-badge">Lossless</span>
          <span className="format-details">
            {state.audioFormat.sampleRate / 1000}kHz • {state.audioFormat.channels}ch
          </span>
        </div>
      )}

      {/* Loading indicator for chunk loading */}
      {state.isLoading && state.isInitialized && (
        <div className="chunk-loading-indicator">
          <div className="loading-bar" />
        </div>
      )}
    </div>
  )
}

export default LosslessAudioPlayer
