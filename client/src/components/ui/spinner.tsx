import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'size-4',
        default: 'size-6',
        lg: 'size-8',
        xl: 'size-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, ...props }: SpinnerProps) {
  return <div data-slot="spinner" className={cn(spinnerVariants({ size }), className)} {...props} />
}

export { Spinner, spinnerVariants }
