import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { type MoviesSearchParams } from '@/features/movies/types/search-params'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from 'lucide-react'

interface FilterBarProps {
  searchParams: Required<MoviesSearchParams>
  totalResults: number
  onUpdateSearchParams: (updates: Partial<MoviesSearchParams>) => void
}

export function FilterBar({ searchParams, totalResults, onUpdateSearchParams }: FilterBarProps) {
  const { limit, sort, order } = searchParams

  const handleLimitChange = (newLimit: number) => {
    onUpdateSearchParams({ limit: newLimit, page: 1 }) // Reset to page 1 when changing limit
  }

  const handleSortChange = (newSort: 'title' | 'year') => {
    onUpdateSearchParams({ sort: newSort, page: 1 }) // Reset to page 1 when changing sort
  }

  const handleOrderToggle = () => {
    const newOrder = order === 'asc' ? 'desc' : 'asc'
    onUpdateSearchParams({ order: newOrder, page: 1 }) // Reset to page 1 when changing order
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-background border-b">
      {/* Left side - Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Per-page limit selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Show:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[80px]">
                {limit}
                <ChevronDownIcon className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {[12, 16, 20].map((limitOption) => (
                <DropdownMenuItem
                  key={limitOption}
                  onClick={() => handleLimitChange(limitOption)}
                  className={limit === limitOption ? 'bg-accent' : ''}
                >
                  {limitOption} per page
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-6" />

        {/* Sort criteria selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[100px] capitalize">
                {sort}
                <ChevronDownIcon className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => handleSortChange('title')}
                className={sort === 'title' ? 'bg-accent' : ''}
              >
                Title
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange('year')}
                className={sort === 'year' ? 'bg-accent' : ''}
              >
                Year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort order toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleOrderToggle}
          className="flex items-center gap-2"
          aria-label={`Sort ${order === 'asc' ? 'ascending' : 'descending'}`}
        >
          {order === 'asc' ? (
            <>
              <ArrowUpIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Asc</span>
            </>
          ) : (
            <>
              <ArrowDownIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Desc</span>
            </>
          )}
        </Button>
      </div>

      {/* Right side - Results count */}
      <div className="text-sm text-muted-foreground">
        {totalResults === 0 ? (
          'No results found'
        ) : (
          <>
            <span className="font-medium">{totalResults.toLocaleString()}</span>
            {totalResults === 1 ? ' movie' : ' movies'}
          </>
        )}
      </div>
    </div>
  )
}
