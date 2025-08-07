import { useAuthStore } from '@/features/auth/stores/auth-store'
import { AuthenticatedStreamingCore, type ChunkRequest, type StreamingConfig, type StreamingError } from '@/lib/authenticated-streaming-core'
import { ChunkManager } from '@/lib/chunk-manager'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface MSEVideoPlayerProps {
    src: string
    poster?: string
    className?: string
    autoPlay?: boolean
    onLoadedMetadata?: () => void
    onTimeUpdate?: (currentTime: number, duration: number) => void
    onEnded?: () => void
    onError?: (error: string) => void
    onWaiting?: () => void
    onCanPlay?: () => void
    videoRef?: React.RefObject<HTMLVideoElement>
}

interface MSEVideoPlayerState {
    mediaSource: MediaSource | null
    sourceBuffer: SourceBuffer | null
    isLoading: boolean
    error: string | null
    bufferedRanges: TimeRanges | null
    currentChunkPosition: number
    totalFileSize: number
    isInitialized: boolean
    retryCount: number
    lastError: StreamingError | null
    isRecovering: boolean
}

// HEVC codec configuration
const HEVC_MIME_TYPE = 'video/mp4; codecs="hev1.1.6.L93.B0, mp4a.40.2"'
const FALLBACK_MIME_TYPE = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'

export const MSEVideoPlayer: React.FC<MSEVideoPlayerProps> = ({
    src,
    poster,
    className,
    autoPlay = false,
    onLoadedMetadata,
    onTimeUpdate,
    onEnded,
    onError,
    onWaiting,
    onCanPlay,
    videoRef: externalVideoRef,
}) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null)
    const videoRef = externalVideoRef || internalVideoRef

    const [state, setState] = useState<MSEVideoPlayerState>({
        mediaSource: null,
        sourceBuffer: null,
        isLoading: true,
        error: null,
        bufferedRanges: null,
        currentChunkPosition: 0,
        totalFileSize: 0,
        isInitialized: false,
        retryCount: 0,
        lastError: null,
        isRecovering: false,
    })

    const streamingCoreRef = useRef<AuthenticatedStreamingCore | null>(null)
    const chunkManagerRef = useRef<ChunkManager | null>(null)
    const loadingChunksRef = useRef<Set<string>>(new Set())
    const pendingChunksRef = useRef<ChunkRequest[]>([])

    // Get auth token
    const { token, isAuthenticated } = useAuthStore()

    // Initialize streaming configuration
    const streamingConfig: StreamingConfig = {
        chunkSize: 1024 * 1024, // 1MB
        maxRetries: 3,
        retryDelay: 1000,
        bufferAhead: 30,
        bufferBehind: 30,
    }

    // Initialize streaming core and chunk manager
    useEffect(() => {
        streamingCoreRef.current = new AuthenticatedStreamingCore(streamingConfig)
        chunkManagerRef.current = new ChunkManager(streamingConfig)
    }, [])

    // Enhanced MSE and codec support detection with detailed fallbacks
    const checkMSESupport = useCallback((): { supported: boolean; mimeType: string; error?: string; codecInfo?: string } => {
        // Check if MSE is available
        if (!window.MediaSource) {
            return {
                supported: false,
                mimeType: '',
                error: 'MediaSource Extensions not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.',
                codecInfo: 'MSE not available'
            }
        }

        // Check if MediaSource is in a usable state
        if (typeof MediaSource.isTypeSupported !== 'function') {
            return {
                supported: false,
                mimeType: '',
                error: 'MediaSource API is incomplete in this browser version.',
                codecInfo: 'MSE API incomplete'
            }
        }

        // Test codec support in order of preference
        const codecTests = [
            {
                mimeType: HEVC_MIME_TYPE,
                name: 'HEVC (H.265)',
                description: 'High-quality video codec with better compression'
            },
            {
                mimeType: FALLBACK_MIME_TYPE,
                name: 'H.264 (AVC)',
                description: 'Standard video codec with broad compatibility'
            },
            {
                mimeType: 'video/mp4; codecs="avc1.640028, mp4a.40.2"',
                name: 'H.264 High Profile',
                description: 'High profile H.264 for better quality'
            },
            {
                mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
                name: 'H.264 Baseline',
                description: 'Basic H.264 profile for maximum compatibility'
            }
        ]

        for (const codec of codecTests) {
            try {
                if (MediaSource.isTypeSupported(codec.mimeType)) {
                    console.info(`MSE Video Player: Using ${codec.name} codec`)
                    return {
                        supported: true,
                        mimeType: codec.mimeType,
                        codecInfo: `${codec.name} - ${codec.description}`
                    }
                }
            } catch (error) {
                console.warn(`Error testing codec ${codec.name}:`, error)
            }
        }

        // If no codecs are supported, provide detailed error
        const userAgent = navigator.userAgent
        let browserSpecificMessage = ''

        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browserSpecificMessage = ' Safari may have limited codec support for MSE.'
        } else if (userAgent.includes('Firefox')) {
            browserSpecificMessage = ' Firefox may require additional codec configuration.'
        } else if (userAgent.includes('Chrome')) {
            browserSpecificMessage = ' Chrome should support these codecs - this may indicate a browser issue.'
        }

        return {
            supported: false,
            mimeType: '',
            error: `No supported video codecs found. This browser does not support HEVC or H.264 with MSE.${browserSpecificMessage}`,
            codecInfo: 'No compatible codecs'
        }
    }, [])

    // Enhanced error handler with recovery logic
    const handleError = useCallback((error: string | StreamingError, canRetry: boolean = false) => {
        const streamingError = typeof error === 'string' ? null : error
        const errorMessage = typeof error === 'string' ? error : error.message

        setState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            lastError: streamingError,
            isRecovering: false
        }))

        // Log detailed error information
        console.error('MSE Video Player Error:', {
            message: errorMessage,
            type: streamingError?.type,
            status: streamingError?.status,
            recoverable: streamingError?.recoverable,
            retryCount: streamingError?.retryCount,
            canRetry
        })

        onError?.(errorMessage)
    }, [onError])

    // Enhanced authentication error handler
    const handleAuthenticationError = useCallback((status: number) => {
        let message = 'Authentication required to play this content'

        switch (status) {
            case 401:
                message = 'Your session has expired. Please log in again to continue watching.'
                break
            case 403:
                message = 'You do not have permission to access this content.'
                break
            default:
                message = 'Authentication failed. Please refresh the page and try again.'
        }

        const authError: StreamingError = {
            name: 'StreamingError',
            message,
            type: 'AUTHENTICATION',
            status,
            recoverable: false
        }

        handleError(authError, false)
    }, [handleError])

    // Network error handler with retry logic
    const handleNetworkError = useCallback((error: any, context: string) => {
        const networkError: StreamingError = {
            name: 'StreamingError',
            message: `Network error during ${context}: ${error.message || 'Connection failed'}`,
            type: 'NETWORK',
            recoverable: true
        }

        handleError(networkError, true)
    }, [handleError])

    // Chunk loading error handler with skip-and-continue functionality
    const handleChunkError = useCallback((chunkRequest: ChunkRequest, error: any) => {
        console.warn(`Failed to load chunk ${chunkRequest.start}-${chunkRequest.end}:`, error)

        // For non-critical chunks, skip and continue
        if (chunkRequest.priority === 'low') {
            console.info('Skipping low-priority chunk and continuing playback')
            return
        }

        // For high-priority chunks, attempt recovery
        const chunkError: StreamingError = {
            name: 'StreamingError',
            message: `Failed to load video chunk. Attempting to continue playback.`,
            type: 'CHUNK_LOAD_FAILED',
            recoverable: true
        }

        handleError(chunkError, true)
    }, [handleError])

    // Load a specific chunk with enhanced error handling
    const loadChunk = useCallback(async (chunk: ChunkRequest) => {
        if (!streamingCoreRef.current || !token?.token || !state.sourceBuffer) {
            return
        }

        const chunkKey = `${chunk.start}-${chunk.end}`

        // Avoid loading the same chunk multiple times
        if (loadingChunksRef.current.has(chunkKey)) {
            return
        }

        // If SourceBuffer is updating, queue the chunk
        if (state.sourceBuffer.updating) {
            pendingChunksRef.current.push(chunk)
            return
        }

        try {
            loadingChunksRef.current.add(chunkKey)

            const chunkData = await streamingCoreRef.current.retryWithBackoff(
                () => streamingCoreRef.current!.fetchChunk(src, chunk, token.token)
            )

            // Append chunk to SourceBuffer if still valid
            if (state.sourceBuffer && !state.sourceBuffer.updating) {
                try {
                    state.sourceBuffer.appendBuffer(chunkData)
                    setState(prev => ({
                        ...prev,
                        currentChunkPosition: chunk.end,
                        retryCount: 0 // Reset retry count on successful load
                    }))
                } catch (appendError) {
                    console.error('Error appending chunk to SourceBuffer:', appendError)
                    handleChunkError(chunk, appendError)
                }
            }

        } catch (error) {
            console.error('Error loading chunk:', error)

            if (error instanceof Error && 'type' in error) {
                const streamingError = error as StreamingError

                switch (streamingError.type) {
                    case 'AUTHENTICATION':
                        handleAuthenticationError(streamingError.status || 401)
                        break

                    case 'NETWORK':
                        handleNetworkError(streamingError, 'chunk loading')
                        break

                    case 'CHUNK_LOAD_FAILED':
                    default:
                        handleChunkError(chunk, streamingError)
                        break
                }
            } else {
                // Handle unknown errors
                handleChunkError(chunk, error)
            }
        } finally {
            loadingChunksRef.current.delete(chunkKey)
        }
    }, [src, token, state.sourceBuffer, handleAuthenticationError, handleNetworkError, handleChunkError])

    // Load next chunks based on current position
    const loadNextChunks = useCallback((currentTime: number) => {
        if (!chunkManagerRef.current || !state.totalFileSize) return

        const duration = videoRef.current?.duration || 100

        // Calculate chunks needed for upcoming playback (buffer ahead)
        const upcomingChunks = chunkManagerRef.current.calculateChunksForTimeRange(
            currentTime,
            currentTime + streamingConfig.bufferAhead,
            duration,
            state.totalFileSize
        )

        // Also calculate chunks for behind buffer to handle seeking backwards
        const behindChunks = chunkManagerRef.current.calculateChunksForTimeRange(
            Math.max(0, currentTime - streamingConfig.bufferBehind),
            currentTime,
            duration,
            state.totalFileSize
        )

        // Combine and prioritize all chunks
        const allChunks = [...upcomingChunks, ...behindChunks]
        const prioritizedChunks = chunkManagerRef.current.prioritizeChunks(currentTime, allChunks)

        // Load chunks in priority order, limiting concurrent loads
        const maxConcurrentLoads = 3
        const currentLoads = loadingChunksRef.current.size
        const availableSlots = Math.max(0, maxConcurrentLoads - currentLoads)

        const chunksToLoad = prioritizedChunks.slice(0, availableSlots)

        for (const chunk of chunksToLoad) {
            loadChunk(chunk)
        }
    }, [state.totalFileSize, videoRef, loadChunk])

    // Load initial chunks with progressive loading
    const loadInitialChunks = useCallback(async (fileSize: number) => {
        if (!chunkManagerRef.current || !streamingCoreRef.current) return

        try {
            // Start with first chunk (1MB) to get playback started quickly
            const firstChunk: ChunkRequest = {
                start: 0,
                end: Math.min(streamingConfig.chunkSize - 1, fileSize - 1),
                priority: 'high'
            }

            // Load first chunk immediately
            await loadChunk(firstChunk)

            // Then progressively load more chunks for smooth playback
            const initialChunks = chunkManagerRef.current.calculateChunksForTimeRange(
                0, // Start at beginning
                15, // Load first 15 seconds worth for smooth start
                100, // Assume 100 second duration initially (will be updated when metadata loads)
                fileSize
            )

            // Filter out the first chunk we already loaded
            const remainingChunks = initialChunks.filter(chunk => chunk.start > firstChunk.end)

            // Prioritize remaining chunks
            const prioritizedChunks = chunkManagerRef.current.prioritizeChunks(0, remainingChunks.slice(0, 4))

            // Load chunks progressively with small delays to avoid overwhelming the connection
            for (let i = 0; i < prioritizedChunks.length; i++) {
                const chunk = prioritizedChunks[i]

                // Add small delay between chunk loads for better performance
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50))
                }

                loadChunk(chunk) // Don't await - load in parallel
            }

        } catch (error) {
            console.error('Error loading initial chunks:', error)
            handleError('Failed to load video content')
        }
    }, [handleError, loadChunk])

    // Recovery mechanism for recoverable errors
    const attemptRecovery = useCallback(async (lastError: StreamingError) => {
        setState(prev => ({
            ...prev,
            isRecovering: true,
            error: null,
            retryCount: prev.retryCount + 1
        }))

        try {
            switch (lastError.type) {
                case 'NETWORK':
                    // For network errors, try to reinitialize the connection
                    if (src && isAuthenticated) {
                        await initializeMediaSource()
                    }
                    break

                case 'CHUNK_LOAD_FAILED':
                    // For chunk loading errors, skip the problematic chunk and continue
                    if (videoRef.current && chunkManagerRef.current) {
                        const currentTime = videoRef.current.currentTime
                        loadNextChunks(currentTime)
                    }
                    break

                case 'AUTHENTICATION':
                    // For auth errors, show clear message - no automatic retry
                    handleError('Authentication expired. Please refresh the page to continue.', false)
                    return

                default:
                    // For unknown errors, try reinitializing
                    if (src && isAuthenticated) {
                        await initializeMediaSource()
                    }
            }

            setState(prev => ({ ...prev, isRecovering: false }))
        } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError)
            handleError('Failed to recover from error. Please refresh the page.', false)
        }
    }, [src, isAuthenticated, videoRef, loadNextChunks, handleError])

    // Handle SourceBuffer update events
    const handleSourceBufferUpdate = useCallback(() => {
        const { sourceBuffer } = state
        if (!sourceBuffer || sourceBuffer.updating) return

        // Update buffered ranges
        setState(prev => ({
            ...prev,
            bufferedRanges: sourceBuffer.buffered
        }))

        // Process pending chunks
        if (pendingChunksRef.current.length > 0) {
            const nextChunk = pendingChunksRef.current.shift()
            if (nextChunk) {
                loadChunk(nextChunk)
            }
        }

        // Check if we need to load more chunks
        if (videoRef.current && chunkManagerRef.current) {
            const currentTime = videoRef.current.currentTime
            const shouldLoad = chunkManagerRef.current.shouldLoadChunk(currentTime, sourceBuffer.buffered)

            if (shouldLoad) {
                loadNextChunks(currentTime)
            }
        }
    }, [state.sourceBuffer, videoRef, loadChunk, loadNextChunks])

    // Initialize MediaSource
    const initializeMediaSource = useCallback(async () => {
        if (!videoRef.current || !isAuthenticated || !token?.token) {
            handleError('Authentication required to play video content')
            return
        }

        // Check MSE support
        const supportCheck = checkMSESupport()
        if (!supportCheck.supported) {
            handleError(supportCheck.error || 'Video format not supported')
            return
        }

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }))

            // Get file size first
            const fileSize = await streamingCoreRef.current!.getFileSize(src, token.token)

            // Create MediaSource
            const mediaSource = new MediaSource()

            const handleSourceOpen = () => {
                try {
                    // Create SourceBuffer with error handling
                    const sourceBuffer = mediaSource.addSourceBuffer(supportCheck.mimeType)

                    // Set up SourceBuffer event handlers
                    sourceBuffer.addEventListener('updateend', handleSourceBufferUpdate)

                    sourceBuffer.addEventListener('error', (e) => {
                        console.error('SourceBuffer error:', e)
                        const bufferError: StreamingError = {
                            name: 'StreamingError',
                            message: 'Video buffer error occurred. This may be due to corrupted video data.',
                            type: 'NETWORK',
                            recoverable: true
                        }
                        handleError(bufferError, true)
                    })

                    sourceBuffer.addEventListener('abort', (e) => {
                        console.warn('SourceBuffer operation aborted:', e)
                    })

                    setState(prev => ({
                        ...prev,
                        mediaSource,
                        sourceBuffer,
                        totalFileSize: fileSize,
                        isInitialized: true,
                        isLoading: false,
                        retryCount: 0 // Reset retry count on successful initialization
                    }))

                    // Start loading initial chunks
                    loadInitialChunks(fileSize)

                } catch (error) {
                    console.error('Error setting up SourceBuffer:', error)

                    let errorMessage = 'Failed to initialize video player'
                    if (error instanceof Error) {
                        if (error.message.includes('codec')) {
                            errorMessage = 'Video codec not supported by this browser'
                        } else if (error.message.includes('quota')) {
                            errorMessage = 'Insufficient memory to load video'
                        }
                    }

                    handleError(errorMessage, false)
                }
            }

            const handleSourceError = (e: Event) => {
                console.error('MediaSource error:', e)
                handleError('Media source error occurred')
            }

            mediaSource.addEventListener('sourceopen', handleSourceOpen)
            mediaSource.addEventListener('error', handleSourceError)

            // Set video source to MediaSource object URL
            videoRef.current.src = URL.createObjectURL(mediaSource)

        } catch (error) {
            console.error('Error initializing MediaSource:', error)
            if (error instanceof Error && 'type' in error) {
                const streamingError = error as StreamingError
                if (streamingError.type === 'AUTHENTICATION') {
                    handleError('Authentication failed. Please log in again.')
                } else {
                    handleError(streamingError.message)
                }
            } else {
                handleError('Failed to initialize video player')
            }
        }
    }, [src, token, isAuthenticated, videoRef, checkMSESupport, handleError, handleSourceBufferUpdate, loadInitialChunks])

    // Handle video events with buffer management
    const handleVideoTimeUpdate = useCallback(() => {
        if (!videoRef.current) return

        const currentTime = videoRef.current.currentTime
        const duration = videoRef.current.duration

        onTimeUpdate?.(currentTime, duration)

        // Update buffered ranges state
        if (state.sourceBuffer) {
            setState(prev => ({
                ...prev,
                bufferedRanges: state.sourceBuffer!.buffered
            }))
        }

        // Clean up old buffers to maintain optimal buffer ranges (30 seconds ahead/behind)
        if (state.sourceBuffer && chunkManagerRef.current && !state.sourceBuffer.updating) {
            chunkManagerRef.current.cleanupOldBuffers(currentTime, state.sourceBuffer, streamingConfig)
        }

        // Check if we need to load more chunks for continuous playback
        if (chunkManagerRef.current && state.sourceBuffer) {
            const shouldLoad = chunkManagerRef.current.shouldLoadChunk(currentTime, state.sourceBuffer.buffered)
            if (shouldLoad) {
                loadNextChunks(currentTime)
            }
        }

        // Monitor buffer health and preload if buffer is getting low
        if (state.sourceBuffer && state.sourceBuffer.buffered.length > 0) {
            const buffered = state.sourceBuffer.buffered
            let bufferAhead = 0

            // Find buffer ahead of current position
            for (let i = 0; i < buffered.length; i++) {
                const start = buffered.start(i)
                const end = buffered.end(i)

                if (start <= currentTime && end > currentTime) {
                    bufferAhead = end - currentTime
                    break
                }
            }

            // If buffer ahead is less than 10 seconds, prioritize loading
            if (bufferAhead < 10 && bufferAhead > 0) {
                loadNextChunks(currentTime)
            }
        }
    }, [videoRef, onTimeUpdate, state.sourceBuffer, loadNextChunks])

    // Handle seeking with chunk prioritization
    const handleVideoSeeked = useCallback(() => {
        if (!videoRef.current || !chunkManagerRef.current || !state.totalFileSize) return

        const currentTime = videoRef.current.currentTime
        const duration = videoRef.current.duration || 100

        // Clear pending chunks as they may no longer be relevant
        pendingChunksRef.current = []

        // Calculate high-priority chunks around the seek position
        const seekChunks = chunkManagerRef.current.calculateChunksForTimeRange(
            Math.max(0, currentTime - 5), // 5 seconds before seek position
            currentTime + 15, // 15 seconds after seek position
            duration,
            state.totalFileSize
        )

        // Mark all chunks as high priority for seeking
        const highPrioritySeekChunks = seekChunks.map(chunk => ({
            ...chunk,
            priority: 'high' as const
        }))

        // Prioritize chunks around seek position
        const prioritizedSeekChunks = chunkManagerRef.current.prioritizeChunks(currentTime, highPrioritySeekChunks)

        // Load immediate chunks for smooth playback after seek
        const immediateChunks = prioritizedSeekChunks.slice(0, 4)
        for (const chunk of immediateChunks) {
            loadChunk(chunk)
        }

        // Then load additional chunks
        setTimeout(() => {
            loadNextChunks(currentTime)
        }, 100)
    }, [videoRef, state.totalFileSize, loadChunk, loadNextChunks])

    // Set up recovery logic with proper dependencies
    useEffect(() => {
        if (state.lastError?.recoverable && state.retryCount < 3 && !state.isRecovering) {
            const timeout = setTimeout(() => {
                attemptRecovery(state.lastError!)
            }, 2000 * Math.pow(2, state.retryCount)) // Exponential backoff

            return () => clearTimeout(timeout)
        }
    }, [state.lastError, state.retryCount, state.isRecovering, attemptRecovery])

    // Initialize when component mounts or src changes
    useEffect(() => {
        if (src && isAuthenticated) {
            initializeMediaSource()
        }

        return () => {
            // Cleanup on unmount
            if (state.mediaSource) {
                try {
                    if (state.mediaSource.readyState === 'open') {
                        state.mediaSource.endOfStream()
                    }
                    URL.revokeObjectURL(videoRef.current?.src || '')
                } catch (error) {
                    console.warn('Error cleaning up MediaSource:', error)
                }
            }
        }
    }, [src, isAuthenticated, initializeMediaSource])

    // Set up video event listeners
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        video.addEventListener('timeupdate', handleVideoTimeUpdate)
        video.addEventListener('seeked', handleVideoSeeked)
        video.addEventListener('loadedmetadata', () => onLoadedMetadata?.())
        video.addEventListener('ended', () => onEnded?.())
        video.addEventListener('waiting', () => onWaiting?.())
        video.addEventListener('canplay', () => onCanPlay?.())

        return () => {
            video.removeEventListener('timeupdate', handleVideoTimeUpdate)
            video.removeEventListener('seeked', handleVideoSeeked)
            video.removeEventListener('loadedmetadata', () => onLoadedMetadata?.())
            video.removeEventListener('ended', () => onEnded?.())
            video.removeEventListener('waiting', () => onWaiting?.())
            video.removeEventListener('canplay', () => onCanPlay?.())
        }
    }, [videoRef, handleVideoTimeUpdate, handleVideoSeeked, onLoadedMetadata, onEnded, onWaiting, onCanPlay])

    // Render recovery state
    if (state.isRecovering) {
        return (
            <div className={`flex items-center justify-center bg-gray-900 text-white p-8 ${className}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-lg font-medium mb-2">Recovering...</p>
                    <p className="text-sm text-white/60">Attempting to restore video playback</p>
                    {state.retryCount > 0 && (
                        <p className="text-xs text-white/40 mt-2">Retry attempt {state.retryCount}/3</p>
                    )}
                </div>
            </div>
        )
    }

    // Render error state with detailed information
    if (state.error) {
        const isAuthError = state.lastError?.type === 'AUTHENTICATION'
        const isNetworkError = state.lastError?.type === 'NETWORK'
        const canRetry = state.lastError?.recoverable && state.retryCount < 3

        return (
            <div className={`flex items-center justify-center bg-gray-900 text-white p-8 ${className}`}>
                <div className="text-center max-w-md">
                    <div className="mb-4">
                        {isAuthError ? (
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
                                </svg>
                            </div>
                        ) : isNetworkError ? (
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <p className="text-lg font-medium mb-2">
                        {isAuthError ? 'Authentication Required' :
                            isNetworkError ? 'Connection Error' : 'Video Error'}
                    </p>
                    <p className="text-sm text-white/60 mb-4">{state.error}</p>

                    {canRetry && (
                        <p className="text-xs text-white/40">
                            Automatic recovery will be attempted in a few seconds...
                        </p>
                    )}

                    {isAuthError && (
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                        >
                            Refresh Page
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Render loading state
    if (state.isLoading) {
        return (
            <div className={`flex items-center justify-center bg-gray-900 text-white p-8 ${className}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-sm text-white/60">Loading video...</p>
                </div>
            </div>
        )
    }

    return (
        <video
            ref={videoRef}
            className={className}
            poster={poster}
            autoPlay={autoPlay}
            controls={false} // We'll handle controls in the parent component
            playsInline
            preload="none"
        />
    )
}