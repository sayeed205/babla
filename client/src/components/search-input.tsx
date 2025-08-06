import React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    debounceMs?: number
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search movies...',
    className,
    debounceMs = 300,
}: SearchInputProps) {
    const [localValue, setLocalValue] = React.useState(value)
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    // Update local value when prop value changes
    React.useEffect(() => {
        setLocalValue(value)
    }, [value])

    // Debounced onChange handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Set new timeout for debounced update
        timeoutRef.current = setTimeout(() => {
            onChange(newValue)
        }, debounceMs)
    }

    // Clear search handler
    const handleClear = () => {
        setLocalValue('')
        onChange('')

        // Clear any pending timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return (
        <div className={cn('relative flex items-center', className)}>
            <Input
                type="text"
                value={localValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="pr-10"
                aria-label="Search movies by title"
                aria-describedby="search-help"
            />

            {/* Clear button - only show when there's a search value */}
            {localValue && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-7 w-7 hover:bg-transparent"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </Button>
            )}

            {/* Hidden helper text for screen readers */}
            <span id="search-help" className="sr-only">
                Search will filter movies by title as you type
            </span>
        </div>
    )
}