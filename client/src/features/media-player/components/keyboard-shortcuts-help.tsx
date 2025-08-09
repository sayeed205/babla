/**
 * KeyboardShortcutsHelp Component
 * Modal dialog showing available keyboard shortcuts
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAccessibility } from '../hooks/use-accessibility'
import { type KeyboardShortcut } from '../hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
  shortcuts?: KeyboardShortcut[] // Make optional
}

export function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null!)
  const { manageFocus, storeFocus, restorePreviousFocus, getAccessibilityClasses } =
    useAccessibility(dialogRef, { trapFocus: true, restoreFocus: true })

  // Use provided shortcuts or empty array
  const shortcutsToShow = shortcuts || []

  // Store focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      storeFocus()
    } else {
      restorePreviousFocus()
    }
  }, [isOpen, storeFocus, restorePreviousFocus])

  // Focus first element when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        manageFocus('first')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, manageFocus])

  // Group shortcuts by category
  const groupedShortcuts = shortcutsToShow.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>
  )

  // Format key display
  const formatKeyDisplay = (shortcut: KeyboardShortcut): string => {
    let keyDisplay = shortcut.key.replace('Key', '').replace('Arrow', '')

    // Special key mappings
    const keyMappings: Record<string, string> = {
      Space: 'Space',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Home: 'Home',
      End: 'End',
      Up: '↑',
      Down: '↓',
      Left: '←',
      Right: '→',
    }

    keyDisplay = keyMappings[keyDisplay] || keyDisplay

    // Add modifiers
    const modifiers: string[] = []
    if (shortcut.shiftKey) modifiers.push('Shift')
    if (shortcut.ctrlKey) modifiers.push('Ctrl')
    if (shortcut.altKey) modifiers.push('Alt')

    return modifiers.length > 0 ? `${modifiers.join('+')}+${keyDisplay}` : keyDisplay
  }

  // Category display names
  const categoryNames: Record<string, string> = {
    playback: 'Playback',
    navigation: 'Navigation',
    volume: 'Volume',
    display: 'Display',
    queue: 'Queue',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={dialogRef}
        className={cn('max-w-2xl max-h-[80vh] overflow-y-auto', getAccessibilityClasses())}
        aria-describedby="keyboard-shortcuts-description"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Keyboard Shortcuts</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
              aria-label="Close keyboard shortcuts help"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription id="keyboard-shortcuts-description">
            Use these keyboard shortcuts to control media playback. Shortcuts work when the media
            player is active and no input field is focused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {categoryNames[category] || category}
              </h3>
              <div className="grid gap-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                      {formatKeyDisplay(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Additional tips */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Keyboard shortcuts are disabled when typing in input fields</li>
              <li>• Use Tab to navigate between player controls</li>
              <li>• Screen reader announcements can be enabled in accessibility settings</li>
              <li>• Press Escape to exit fullscreen mode</li>
              <li>• Use ? (Shift+/) to show this help dialog</li>
            </ul>
          </div>

          {/* Accessibility note */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Accessibility:</strong> This media player supports screen readers, keyboard
              navigation, and respects your system's motion and contrast preferences. Use Tab to
              navigate controls and Enter or Space to activate buttons.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="min-w-[100px]">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
