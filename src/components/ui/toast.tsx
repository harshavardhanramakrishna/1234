import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
      animation: {
        enter: "animate-in fade-in-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
        exit: "animate-out fade-out-80 slide-out-to-right-full",
        move: "translate-x-[var(--radix-toast-swipe-move-x)] transition-none",
        cancel: "translate-x-0",
        end: "translate-x-[var(--radix-toast-swipe-end-x)] animate-out"
      }
    },
    defaultVariants: {
      variant: "default",
      animation: "enter"
    }
  }
)

type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastVariants>

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Toast.displayName = "Toast"

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="toast-provider">
      {children}
      <ToastViewport />
    </div>
  )
}

const ToastViewport = () => {
  return (
    <div className="toast-viewport fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-[10px] p-[var(--viewport-padding)] outline-none [--viewport-padding:_25px]">
      {/* Toast items will be rendered here */}
    </div>
  )
}

const ToastTitle = ({ children }: { children: React.ReactNode }) => {
  return <div className="toast-title [grid-area:_title] font-medium">{children}</div>
}

const ToastDescription = ({ children }: { children: React.ReactNode }) => {
  return <div className="toast-description [grid-area:_description] text-sm opacity-90">{children}</div>
}

const ToastClose = () => {
  return (
    <button className="toast-close absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50">
      <X className="h-4 w-4" />
    </button>
  )
}

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  type ToastProps
}
