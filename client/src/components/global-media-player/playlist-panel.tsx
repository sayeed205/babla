import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/media-utils'
import { cn } from '@/lib/utils'
import { useMediaPlayerStore } from '@/stores/media-player-store'
import { List, Trash2, X } from 'lucide-react'
import { useState } from 'react'

export function PlaylistPanel() {
  const [isOpen, setIsOpen] = useState(false)

  const { playlist, currentMedia, playFromPlaylist, removeFromPlaylist, clearPlaylist } =
    useMediaPlayerStore()

  if (playlist.length === 0) {
    return null
  }

  return (
    <>
      {/* Playlist Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:bg-white/20 p-2 relative"
      >
        <List className="w-4 h-4" />
        {playlist.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {playlist.length}
          </span>
        )}
      </Button>

      {/* Playlist Panel */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 max-h-96 bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/20">
            <h3 className="text-white font-medium">Playlist ({playlist.length})</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPlaylist}
                className="text-white/60 hover:text-white hover:bg-white/20 p-1 h-6 w-6"
                title="Clear playlist"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/20 p-1 h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Playlist Items */}
          <div className="max-h-80 overflow-y-auto">
            {playlist.map((item, index) => {
              const isCurrentItem = currentMedia?.id === item.id

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0',
                    isCurrentItem && 'bg-white/20'
                  )}
                  onClick={() => playFromPlaylist(index)}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-white/40 text-xs">
                          {item.type === 'video' ? '🎬' : '🎵'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isCurrentItem ? 'text-white' : 'text-white/80'
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      {item.artist && <span>{item.artist}</span>}
                      {item.year && <span>{item.year}</span>}
                      {item.duration && <span>{formatDuration(item.duration)}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isCurrentItem && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromPlaylist(item.id)
                      }}
                      className="text-white/40 hover:text-white hover:bg-white/20 p-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {playlist.length > 0 && (
            <div className="p-3 border-t border-white/20 text-center">
              <p className="text-xs text-white/60">
                Total: {playlist.length} item{playlist.length !== 1 ? 's' : ''}
                {playlist.reduce((total, item) => total + (item.duration || 0), 0) > 0 && (
                  <span>
                    {' '}
                    •{' '}
                    {formatDuration(
                      playlist.reduce((total, item) => total + (item.duration || 0), 0)
                    )}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
