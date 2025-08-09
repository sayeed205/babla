/**
 * UnsupportedMediaFallback Component
 * Fallback UI for unsupported media types
 * Provides alternative options and helpful information
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AlertCircle, Download, ExternalLink, FileX, Info, Monitor, Smartphone } from 'lucide-react'
import type { MediaItem } from '../types/media-player-types'

interface UnsupportedMediaFallbackProps {
  media: MediaItem
  className?: string
  onClose?: () => void
  onDownload?: () => void
  onOpenExternal?: () => void
}

export function UnsupportedMediaFallback({
  media,
  className,
  onClose,
  onDownload,
  onOpenExternal,
}: UnsupportedMediaFallbackProps) {
  const getSupportedFormats = () => {
    const videoFormats = ['MP4', 'WebM', 'OGV']
    const audioFormats = ['MP3', 'OGG', 'WAV', 'AAC']

    switch (media.type) {
      case 'movie':
      case 'tv':
        return videoFormats
      case 'music':
        return audioFormats
      default:
        return [...videoFormats, ...audioFormats]
    }
  }

  const getMediaTypeLabel = () => {
    switch (media.type) {
      case 'movie':
        return 'Movie'
      case 'tv':
        return 'TV Episode'
      case 'music':
        return 'Audio'
      default:
        return 'Media'
    }
  }

  const getBrowserCompatibilityInfo = () => {
    const userAgent = navigator.userAgent
    const isChrome = /Chrome/.test(userAgent)
    const isFirefox = /Firefox/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isEdge = /Edge/.test(userAgent)

    if (isChrome) {
      return {
        browser: 'Chrome',
        recommendation:
          'Chrome has excellent media format support. Try updating to the latest version.',
        icon: <Monitor className="h-4 w-4" />,
      }
    } else if (isFirefox) {
      return {
        browser: 'Firefox',
        recommendation:
          'Firefox supports most formats. Consider trying Chrome for better compatibility.',
        icon: <Monitor className="h-4 w-4" />,
      }
    } else if (isSafari) {
      return {
        browser: 'Safari',
        recommendation:
          'Safari has limited codec support. Try Chrome or Firefox for better compatibility.',
        icon: <Monitor className="h-4 w-4" />,
      }
    } else if (isEdge) {
      return {
        browser: 'Edge',
        recommendation: 'Edge has good media support. Try updating to the latest version.',
        icon: <Monitor className="h-4 w-4" />,
      }
    } else {
      return {
        browser: 'Unknown',
        recommendation: 'Try using Chrome, Firefox, or Edge for better media compatibility.',
        icon: <Monitor className="h-4 w-4" />,
      }
    }
  }

  const browserInfo = getBrowserCompatibilityInfo()
  const supportedFormats = getSupportedFormats()

  return (
    <Card
      className={cn(
        'w-full max-w-lg mx-auto bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
        className
      )}
    >
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <FileX className="h-12 w-12 text-orange-500" />
        </div>
        <CardTitle className="text-orange-700 dark:text-orange-300">
          Unsupported {getMediaTypeLabel()} Format
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-400">
          This {media.type} cannot be played in your current browser
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Media information */}
        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{media.title}</h4>
          {media.type === 'tv' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {(media as any).seriesTitle && `${(media as any).seriesTitle} • `}
              Season {(media as any).seasonNumber}, Episode {(media as any).episodeNumber}
            </p>
          )}
          {media.type === 'music' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {(media as any).artist && `by ${(media as any).artist}`}
              {(media as any).album && ` • ${(media as any).album}`}
            </p>
          )}
        </div>

        {/* Browser compatibility info */}
        <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
              Browser Compatibility
            </h5>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {browserInfo.recommendation}
            </p>
          </div>
        </div>

        {/* Supported formats */}
        <div>
          <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">
            Supported Formats:
          </h5>
          <div className="flex flex-wrap gap-2">
            {supportedFormats.map((format) => (
              <span
                key={format}
                className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full"
              >
                {format}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onDownload && (
              <Button onClick={onDownload} variant="default" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            )}

            {onOpenExternal && (
              <Button onClick={onOpenExternal} variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Externally
              </Button>
            )}
          </div>

          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm" className="w-full">
              Close Player
            </Button>
          )}
        </div>

        {/* Troubleshooting tips */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 mb-2">
            Troubleshooting Tips
          </summary>
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Update your browser to the latest version for better codec support
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Monitor className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Try using Chrome or Firefox for the best media compatibility
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Smartphone className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                On mobile devices, try opening the link in your default browser
              </p>
            </div>
          </div>
        </details>

        {/* Additional help */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p>
            If you continue to have issues, please contact support or try downloading the file
            directly.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
