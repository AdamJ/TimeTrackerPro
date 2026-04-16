import type { ReactNode } from "react";
import SiteNavigationMenu from "@/components/Navigation";

interface PageLayoutProps {
	title?: ReactNode;
	icon?: ReactNode;
	actions?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
}

export const PageLayout = ({
	title,
	icon,
	actions,
	description,
	children,
}: PageLayoutProps) => {
	return (
		<div className="min-h-screen bg-background">
			<SiteNavigationMenu />
			{title !== undefined && (
				<div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
					<div className="flex items-center justify-between">
						<h1 className="md:text-2xl font-bold text-foreground flex items-center gap-2">
							{icon}
							{title}
						</h1>
						{actions && <div className="print:hidden">{actions}</div>}
					</div>
					{description && (
						<p className="text-sm text-muted-foreground mt-1">{description}</p>
					)}
				</div>
			)}
			{children}
		</div>
	);
};
