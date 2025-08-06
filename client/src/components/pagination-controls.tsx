import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string | null
  nextPageUrl: string | null
  previousPageUrl: string | null
}

interface PaginationControlsProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function PaginationControls({ meta, onPageChange }: PaginationControlsProps) {
  const { currentPage, lastPage: totalPages, nextPageUrl, previousPageUrl } = meta

  const hasNextPage = nextPageUrl !== null
  const hasPreviousPage = previousPageUrl !== null

  // Don't render pagination if there's only one page or no pages
  if (totalPages <= 1) {
    return null
  }

  // Generate page numbers with ellipsis logic
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const delta = 2 // Number of pages to show around current page

    // Always show first page
    pages.push(1)

    // Calculate start and end of the range around current page
    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push('ellipsis')
    }

    // Add pages in the range around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push('ellipsis')
    }

    // Always show last page (if it's not the first page)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = generatePageNumbers()

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          <PaginationPrevious
            onClick={() => hasPreviousPage && onPageChange(currentPage - 1)}
            className={
              !hasPreviousPage
                ? 'pointer-events-none opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }
            aria-disabled={!hasPreviousPage}
          />
        </PaginationItem>

        {/* Page numbers with ellipsis */}
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                className="cursor-pointer"
                aria-label={`Go to page ${page}`}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next button */}
        <PaginationItem>
          <PaginationNext
            onClick={() => hasNextPage && onPageChange(currentPage + 1)}
            className={
              !hasNextPage ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }
            aria-disabled={!hasNextPage}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

// Export the interface for reuse in other features
export type { PaginationMeta }
