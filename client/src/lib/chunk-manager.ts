/**
 * ChunkManager - Manages video chunk loading, buffering, and seeking optimization
 * for MSE-based video streaming
 */

import type { ChunkRequest, StreamingConfig } from './authenticated-streaming-core'

export interface BufferRange {
  start: number
  end: number
  priority: number
}

export interface ChunkPriority {
  chunk: ChunkRequest
  distance: number // Distance from current playback position
  priority: 'high' | 'normal' | 'low'
}

export class ChunkManager {
  private config: StreamingConfig

  constructor(config: StreamingConfig) {
    this.config = config
  }

  /**
   * Calculates the chunks needed for a specific time range for seeking optimization
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @param duration - Total video duration in seconds
   * @param fileSize - Total file size in bytes
   * @returns ChunkRequest[] - Array of chunk requests needed for the time range
   */
  calculateChunksForTimeRange(
    startTime: number,
    endTime: number,
    duration: number,
    fileSize: number
  ): ChunkRequest[] {
    if (duration <= 0 || fileSize <= 0) {
      return []
    }

    // Calculate bytes per second
    const bytesPerSecond = fileSize / duration

    // Calculate byte positions for the time range
    const startByte = Math.floor(startTime * bytesPerSecond)
    const endByte = Math.floor(endTime * bytesPerSecond)

    // Ensure we don't exceed file boundaries
    const clampedStartByte = Math.max(0, startByte)
    const clampedEndByte = Math.min(fileSize - 1, endByte)

    // Split the range into chunks based on configured chunk size
    const chunks: ChunkRequest[] = []
    let currentStart = clampedStartByte

    while (currentStart <= clampedEndByte) {
      const currentEnd = Math.min(currentStart + this.config.chunkSize - 1, clampedEndByte)

      // Determine priority based on proximity to start time
      const chunkMidpoint = (currentStart + currentEnd) / 2
      const chunkTime = chunkMidpoint / bytesPerSecond
      const distanceFromStart = Math.abs(chunkTime - startTime)

      let priority: ChunkRequest['priority'] = 'normal'
      if (distanceFromStart <= 5) {
        // Within 5 seconds
        priority = 'high'
      } else if (distanceFromStart > 15) {
        // More than 15 seconds away
        priority = 'low'
      }

      chunks.push({
        start: currentStart,
        end: currentEnd,
        priority,
      })

      currentStart = currentEnd + 1
    }

    return chunks
  }

  /**
   * Determines when to fetch new chunks based on current playback position and buffer state
   * @param timePosition - Current playback time in seconds
   * @param bufferedRanges - Currently buffered time ranges
   * @returns boolean - Whether new chunks should be loaded
   */
  shouldLoadChunk(timePosition: number, bufferedRanges: TimeRanges): boolean {
    if (!bufferedRanges || bufferedRanges.length === 0) {
      return true // No buffer, definitely need to load
    }

    // Check if current position is buffered
    const isCurrentPositionBuffered = this.isTimeBuffered(timePosition, bufferedRanges)
    if (!isCurrentPositionBuffered) {
      return true // Current position not buffered, need to load
    }

    // Check buffer ahead - how much content is buffered ahead of current position
    const bufferAhead = this.getBufferAhead(timePosition, bufferedRanges)
    if (bufferAhead < this.config.bufferAhead) {
      return true // Not enough buffer ahead, need to load more
    }

    // Check for gaps in the buffer that need filling
    const hasGapsNearPosition = this.hasBufferGapsNear(timePosition, bufferedRanges, 10) // 10 second window
    if (hasGapsNearPosition) {
      return true // Gaps detected, need to fill them
    }

    return false // Buffer is adequate, no need to load
  }

  /**
   * Cleans up old buffer ranges to manage memory usage
   * @param currentTime - Current playback time in seconds
   * @param sourceBuffer - The SourceBuffer to clean up
   * @param config - Streaming configuration
   */
  cleanupOldBuffers(
    currentTime: number,
    sourceBuffer: SourceBuffer,
    config: StreamingConfig
  ): void {
    if (!sourceBuffer || sourceBuffer.updating) {
      return // Can't clean up while updating
    }

    try {
      const buffered = sourceBuffer.buffered
      if (!buffered || buffered.length === 0) {
        return
      }

      // Calculate cleanup boundaries
      const cleanupBefore = Math.max(0, currentTime - config.bufferBehind)
      const keepAfter = currentTime + config.bufferAhead

      // Find ranges to remove (before cleanup boundary)
      for (let i = 0; i < buffered.length; i++) {
        const rangeStart = buffered.start(i)
        const rangeEnd = buffered.end(i)

        // If entire range is before cleanup boundary, remove it
        if (rangeEnd < cleanupBefore) {
          sourceBuffer.remove(rangeStart, rangeEnd)
          return // Only remove one range at a time to avoid conflicts
        }

        // If range starts before cleanup boundary but extends past it, trim the beginning
        if (rangeStart < cleanupBefore && rangeEnd >= cleanupBefore) {
          sourceBuffer.remove(rangeStart, cleanupBefore)
          return
        }

        // If range is far ahead of current position, remove it to save memory
        if (rangeStart > keepAfter + 60) {
          // Keep some extra buffer, but not too much
          sourceBuffer.remove(rangeStart, rangeEnd)
          return
        }
      }
    } catch (error) {
      console.warn('Error cleaning up old buffers:', error)
      // Don't throw - buffer cleanup is not critical for playback
    }
  }

  /**
   * Prioritizes chunks based on current playback position for optimal loading order
   * @param currentTime - Current playback time in seconds
   * @param chunks - Array of chunks to prioritize
   * @returns ChunkRequest[] - Sorted array with highest priority chunks first
   */
  prioritizeChunks(currentTime: number, chunks: ChunkRequest[]): ChunkRequest[] {
    if (chunks.length === 0) {
      return []
    }

    // Create priority objects with distance calculations
    const chunkPriorities: ChunkPriority[] = chunks.map((chunk) => {
      // Estimate time position of chunk (rough approximation)
      const chunkMidpoint = (chunk.start + chunk.end) / 2
      const estimatedTime = this.estimateTimeFromByte(chunkMidpoint, chunks, currentTime)
      const distance = Math.abs(estimatedTime - currentTime)

      return {
        chunk,
        distance,
        priority: chunk.priority,
      }
    })

    // Sort by priority and distance
    return chunkPriorities
      .sort((a, b) => {
        // First sort by priority level
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) {
          return priorityDiff
        }

        // Then sort by distance from current position
        return a.distance - b.distance
      })
      .map((item) => item.chunk)
  }

  /**
   * Checks if a specific time is currently buffered
   * @param time - Time in seconds to check
   * @param bufferedRanges - Currently buffered time ranges
   * @returns boolean - Whether the time is buffered
   */
  private isTimeBuffered(time: number, bufferedRanges: TimeRanges): boolean {
    for (let i = 0; i < bufferedRanges.length; i++) {
      if (time >= bufferedRanges.start(i) && time <= bufferedRanges.end(i)) {
        return true
      }
    }
    return false
  }

  /**
   * Calculates how much content is buffered ahead of the current position
   * @param currentTime - Current playback time in seconds
   * @param bufferedRanges - Currently buffered time ranges
   * @returns number - Seconds of content buffered ahead
   */
  private getBufferAhead(currentTime: number, bufferedRanges: TimeRanges): number {
    let maxBufferEnd = currentTime

    for (let i = 0; i < bufferedRanges.length; i++) {
      const rangeStart = bufferedRanges.start(i)
      const rangeEnd = bufferedRanges.end(i)

      // If range contains or starts after current time
      if (rangeStart <= currentTime && rangeEnd > currentTime) {
        maxBufferEnd = Math.max(maxBufferEnd, rangeEnd)
      } else if (rangeStart > currentTime) {
        // For ranges that start after current time, only count if they're continuous
        if (rangeStart <= maxBufferEnd + 1) {
          // Allow small gaps (1 second)
          maxBufferEnd = Math.max(maxBufferEnd, rangeEnd)
        }
      }
    }

    return Math.max(0, maxBufferEnd - currentTime)
  }

  /**
   * Checks for gaps in the buffer near the current position
   * @param currentTime - Current playback time in seconds
   * @param bufferedRanges - Currently buffered time ranges
   * @param windowSize - Size of window to check for gaps (in seconds)
   * @returns boolean - Whether there are gaps in the specified window
   */
  private hasBufferGapsNear(
    currentTime: number,
    bufferedRanges: TimeRanges,
    windowSize: number
  ): boolean {
    const windowStart = currentTime
    const windowEnd = currentTime + windowSize

    let lastBufferedEnd = windowStart

    for (let i = 0; i < bufferedRanges.length; i++) {
      const rangeStart = bufferedRanges.start(i)
      const rangeEnd = bufferedRanges.end(i)

      // Skip ranges that end before our window
      if (rangeEnd < windowStart) {
        continue
      }

      // Skip ranges that start after our window
      if (rangeStart > windowEnd) {
        break
      }

      // Check for gap between last buffered end and this range start
      const effectiveRangeStart = Math.max(rangeStart, windowStart)
      if (effectiveRangeStart > lastBufferedEnd + 0.5) {
        // 0.5 second tolerance
        return true // Gap detected
      }

      lastBufferedEnd = Math.min(rangeEnd, windowEnd)
    }

    // Check if there's a gap at the end of our window
    return lastBufferedEnd < windowEnd - 0.5
  }

  /**
   * Estimates time position from byte position (rough approximation)
   * @param bytePosition - Byte position in file
   * @param chunks - Available chunks for context
   * @param currentTime - Current playback time for reference
   * @returns number - Estimated time in seconds
   */
  private estimateTimeFromByte(
    bytePosition: number,
    chunks: ChunkRequest[],
    currentTime: number
  ): number {
    if (chunks.length === 0) {
      return currentTime
    }

    // Simple linear estimation - in reality this would be more complex
    // due to variable bitrate encoding, but this provides a reasonable approximation
    const firstChunk = chunks[0]
    const lastChunk = chunks[chunks.length - 1]

    if (firstChunk.start === lastChunk.end) {
      return currentTime
    }

    const byteRange = lastChunk.end - firstChunk.start
    const relativePosition = (bytePosition - firstChunk.start) / byteRange

    // Assume chunks represent a reasonable time window around current position
    const estimatedTimeRange = this.config.bufferAhead * 2 // Rough estimate
    return currentTime + (relativePosition - 0.5) * estimatedTimeRange
  }

  /**
   * Updates the streaming configuration
   * @param newConfig - New streaming configuration
   */
  updateConfig(newConfig: StreamingConfig): void {
    this.config = newConfig
  }

  /**
   * Gets the current streaming configuration
   * @returns StreamingConfig - Current configuration
   */
  getConfig(): StreamingConfig {
    return { ...this.config }
  }
}
