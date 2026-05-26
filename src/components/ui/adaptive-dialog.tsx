import * as React from "react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog"

interface AdaptiveDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	children: React.ReactNode
	/** unused — kept for API compatibility */
	snapPoints?: (number | string)[]
}

export const AdaptiveDialog = ({
	open,
	onOpenChange,
	children,
}: AdaptiveDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{children}
		</Dialog>
	)
}

interface AdaptiveDialogContentProps {
	children: React.ReactNode
	className?: string
}

export const AdaptiveDialogContent = ({
	children,
	className,
}: AdaptiveDialogContentProps) => {
	return (
		<DialogContent className={className}>
			{children}
		</DialogContent>
	)
}

export const AdaptiveDialogHeader = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return <DialogHeader className={className}>{children}</DialogHeader>
}

export const AdaptiveDialogTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => {
	return (
		<DialogTitle ref={ref} className={className} {...props}>
			{children}
		</DialogTitle>
	)
})
AdaptiveDialogTitle.displayName = "AdaptiveDialogTitle"

export const AdaptiveDialogDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => {
	return (
		<DialogDescription ref={ref} className={className} {...props}>
			{children}
		</DialogDescription>
	)
})
AdaptiveDialogDescription.displayName = "AdaptiveDialogDescription"

export const AdaptiveDialogFooter = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return <DialogFooter className={className}>{children}</DialogFooter>
}
