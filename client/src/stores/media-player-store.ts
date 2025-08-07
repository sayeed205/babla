import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MediaItem {
  id: string
  title: string
  src: string
  type: 'video' | 'audio'
  poster?: string
  artist?: string
  album?: string
  duration?: number
  // Movie/TV specific
  movieId?: string
  tvId?: string
  seasonNumber?: number
  episodeNumber?: number
  // Additional metadata
  year?: number
  genre?: string[]
  description?: string
}

interface MediaPlayerState {
  // Current media
  currentMedia: MediaItem | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean

  // Player visibility
  isPlayerVisible: boolean
  isMinimized: boolean

  // Playlist/Queue
  playlist: MediaItem[]
  currentIndex: number

  // Settings
  autoPlay: boolean
  repeatMode: 'none' | 'one' | 'all'
  shuffleMode: boolean

  // Actions
  playMedia: (media: MediaItem) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  showPlayer: () => void
  hidePlayer: () => void
  toggleMinimize: () => void

  // Playlist actions
  addToPlaylist: (media: MediaItem) => void
  removeFromPlaylist: (id: string) => void
  clearPlaylist: () => void
  playNext: () => void
  playPrevious: () => void
  playFromPlaylist: (index: number) => void

  // Settings actions
  setAutoPlay: (autoPlay: boolean) => void
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void
  toggleShuffle: () => void

  // Internal state updates (called by the player component)
  updateCurrentTime: (time: number) => void
  updateDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
}

export const useMediaPlayerStore = create<MediaPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMedia: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      isFullscreen: false,
      isPlayerVisible: false,
      isMinimized: false,
      playlist: [],
      currentIndex: -1,
      autoPlay: true,
      repeatMode: 'none',
      shuffleMode: false,

      // Media control actions
      playMedia: (media) => {
        const state = get()

        // Add to playlist if not already there
        const existingIndex = state.playlist.findIndex((item) => item.id === media.id)
        let newPlaylist = state.playlist
        let newIndex = existingIndex

        if (existingIndex === -1) {
          newPlaylist = [...state.playlist, media]
          newIndex = newPlaylist.length - 1
        }

        set({
          currentMedia: media,
          isPlaying: true,
          isPlayerVisible: true,
          isMinimized: false,
          playlist: newPlaylist,
          currentIndex: newIndex,
          currentTime: 0,
        })
      },

      pause: () => set({ isPlaying: false }),

      resume: () => set({ isPlaying: true }),

      stop: () =>
        set({
          isPlaying: false,
          currentTime: 0,
          currentMedia: null,
          isPlayerVisible: false,
        }),

      seekTo: (time) => set({ currentTime: time }),

      setVolume: (volume) =>
        set({
          volume: Math.max(0, Math.min(1, volume)),
          isMuted: volume === 0,
        }),

      toggleMute: () => {
        const { isMuted, volume } = get()
        set({
          isMuted: !isMuted,
          volume: isMuted ? volume || 0.5 : 0,
        })
      },

      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

      // Player visibility
      showPlayer: () => set({ isPlayerVisible: true, isMinimized: false }),

      hidePlayer: () => set({ isPlayerVisible: false }),

      toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      // Playlist actions
      addToPlaylist: (media) => {
        const state = get()
        const exists = state.playlist.some((item) => item.id === media.id)
        if (!exists) {
          set({ playlist: [...state.playlist, media] })
        }
      },

      removeFromPlaylist: (id) => {
        const state = get()
        const newPlaylist = state.playlist.filter((item) => item.id !== id)
        const currentIndex = newPlaylist.findIndex((item) => item.id === state.currentMedia?.id)

        set({
          playlist: newPlaylist,
          currentIndex: currentIndex >= 0 ? currentIndex : -1,
        })
      },

      clearPlaylist: () => set({ playlist: [], currentIndex: -1 }),

      playNext: () => {
        const { playlist, currentIndex, repeatMode, shuffleMode } = get()
        if (playlist.length === 0) return

        let nextIndex = currentIndex + 1

        if (shuffleMode) {
          // Random next song (excluding current)
          const availableIndices = playlist.map((_, i) => i).filter((i) => i !== currentIndex)
          nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        } else if (nextIndex >= playlist.length) {
          if (repeatMode === 'all') {
            nextIndex = 0
          } else {
            return // End of playlist
          }
        }

        const nextMedia = playlist[nextIndex]
        if (nextMedia) {
          set({
            currentMedia: nextMedia,
            currentIndex: nextIndex,
            currentTime: 0,
            isPlaying: true,
          })
        }
      },

      playPrevious: () => {
        const { playlist, currentIndex } = get()
        if (playlist.length === 0) return

        let prevIndex = currentIndex - 1
        if (prevIndex < 0) {
          prevIndex = playlist.length - 1
        }

        const prevMedia = playlist[prevIndex]
        if (prevMedia) {
          set({
            currentMedia: prevMedia,
            currentIndex: prevIndex,
            currentTime: 0,
            isPlaying: true,
          })
        }
      },

      playFromPlaylist: (index) => {
        const { playlist } = get()
        const media = playlist[index]
        if (media) {
          set({
            currentMedia: media,
            currentIndex: index,
            currentTime: 0,
            isPlaying: true,
            isPlayerVisible: true,
            isMinimized: false,
          })
        }
      },

      // Settings
      setAutoPlay: (autoPlay) => set({ autoPlay }),

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      toggleShuffle: () => set((state) => ({ shuffleMode: !state.shuffleMode })),

      // Internal updates
      updateCurrentTime: (time) => set({ currentTime: time }),

      updateDuration: (duration) => set({ duration }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),
    }),
    {
      name: 'media-player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        autoPlay: state.autoPlay,
        repeatMode: state.repeatMode,
        shuffleMode: state.shuffleMode,
        playlist: state.playlist,
      }),
    }
  )
)
