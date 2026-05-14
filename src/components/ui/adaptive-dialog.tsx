import * as React from "react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
} from "@/components/ui/drawer"

const isIosBuild = import.meta.env.VITE_IOS_BUILD === "true"

interface AdaptiveDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	children: React.ReactNode
	/** vaul snap points, iOS only */
	snapPoints?: (number | string)[]
}

export const AdaptiveDialog = ({
	open,
	onOpenChange,
	children,
	snapPoints,
}: AdaptiveDialogProps) => {
	const [activeSnapPoint, setActiveSnapPoint] = React.useState<number | string | null>(
		snapPoints?.[0] ?? null
	)

	React.useEffect(() => {
		if (open) {
			setActiveSnapPoint(snapPoints?.[0] ?? null)
		}
	}, [open]) // snapPoints are static per dialog instance

	if (isIosBuild) {
		return (
			<Drawer
				open={open}
				onOpenChange={onOpenChange}
				snapPoints={snapPoints}
				activeSnapPoint={activeSnapPoint}
				setActiveSnapPoint={setActiveSnapPoint}
			>
				{children}
			</Drawer>
		)
	}
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
	if (isIosBuild) {
		return (
			<DrawerContent className={className}>
				{children}
			</DrawerContent>
		)
	}
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
	if (isIosBuild) {
		return <DrawerHeader className={className}>{children}</DrawerHeader>
	}
	return <DialogHeader className={className}>{children}</DialogHeader>
}

export const AdaptiveDialogTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => {
	if (isIosBuild) {
		return (
			<DrawerTitle ref={ref} className={className} {...props}>
				{children}
			</DrawerTitle>
		)
	}
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
	if (isIosBuild) {
		return (
			<DrawerDescription ref={ref} className={className} {...props}>
				{children}
			</DrawerDescription>
		)
	}
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
	if (isIosBuild) {
		return (
			<DrawerFooter className={className}>
				{children}
			</DrawerFooter>
		)
	}
	return <DialogFooter className={className}>{children}</DialogFooter>
}
