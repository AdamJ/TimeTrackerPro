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

function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(
		() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
	)
	React.useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)")
		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
		mq.addEventListener("change", handler)
		return () => mq.removeEventListener("change", handler)
	}, [])
	return isMobile
}

interface AdaptiveDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	children: React.ReactNode
	/** vaul snap points, mobile only */
	snapPoints?: (number | string)[]
}

export const AdaptiveDialog = ({
	open,
	onOpenChange,
	children,
	snapPoints,
}: AdaptiveDialogProps) => {
	const isMobile = useIsMobile()
	const [activeSnapPoint, setActiveSnapPoint] = React.useState<number | string | null>(
		snapPoints?.[0] ?? null
	)

	React.useEffect(() => {
		if (open) {
			setActiveSnapPoint(snapPoints?.[0] ?? null)
		}
	}, [open]) // snapPoints are static per dialog instance

	if (isMobile) {
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
	const isMobile = useIsMobile()
	if (isMobile) {
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
	const isMobile = useIsMobile()
	if (isMobile) {
		return <DrawerHeader className={className}>{children}</DrawerHeader>
	}
	return <DialogHeader className={className}>{children}</DialogHeader>
}

export const AdaptiveDialogTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => {
	const isMobile = useIsMobile()
	if (isMobile) {
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
	const isMobile = useIsMobile()
	if (isMobile) {
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
	const isMobile = useIsMobile()
	if (isMobile) {
		return (
			<DrawerFooter className={className}>
				{children}
			</DrawerFooter>
		)
	}
	return <DialogFooter className={className}>{children}</DialogFooter>
}
