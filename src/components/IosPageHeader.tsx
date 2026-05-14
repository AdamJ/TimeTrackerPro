import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IosPageHeaderProps {
	title?: ReactNode;
	actions?: ReactNode;
	/** Show back chevron. Pass true to use history.back(), or a path string to navigate there. */
	back?: boolean | string;
}

export const IosPageHeader = ({ title, actions, back }: IosPageHeaderProps) => {
	const navigate = useNavigate();

	const handleBack = () => {
		if (typeof back === "string") {
			navigate(back);
		} else {
			navigate(-1);
		}
	};

	return (
		<header
			className="sticky top-0 z-30 flex items-center justify-between bg-background/95 backdrop-blur-md border-b border-border print:hidden"
			style={{ paddingTop: "env(safe-area-inset-top)" }}
		>
			<div className="flex items-center h-11 px-2 w-full">
				{back ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="flex items-center gap-0.5 text-primary pl-1 pr-2 min-h-[44px]"
						aria-label="Go back"
					>
						<ChevronLeft className="h-5 w-5" />
						<span className="text-sm">Back</span>
					</Button>
				) : (
					<div className="w-20" />
				)}

				{title && (
					<h1 className="flex-1 text-center text-[17px] font-semibold text-foreground truncate px-2">
						{title}
					</h1>
				)}

				{actions ? (
					<div className="flex items-center gap-1 w-20 justify-end pr-2">
						{actions}
					</div>
				) : (
					<div className="w-20" />
				)}
			</div>
		</header>
	);
};
