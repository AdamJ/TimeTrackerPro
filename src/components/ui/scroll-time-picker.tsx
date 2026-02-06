import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/util";

interface ScrollTimePickerProps {
	value: string; // "HH:MM" 24-hour format
	onValueChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = [0, 15, 30, 45];
const PERIODS = ["AM", "PM"] as const;

const ITEM_HEIGHT = 40; // px per item
const VISIBLE_ITEMS = 5; // show 5 items, center is selected

function parse24Hour(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
	const [h, m] = value.split(":").map(Number);
	const period = h >= 12 ? "PM" : "AM";
	let hour12 = h % 12;
	hour12 = hour12 === 0 ? 12 : hour12;
	// Round minute to nearest 15
	const minute = Math.round(m / 15) * 15 === 60 ? 0 : Math.round(m / 15) * 15;
	return { hour12, minute, period };
}

function to24Hour(hour12: number, minute: number, period: "AM" | "PM"): string {
	let h = hour12;
	if (period === "AM" && h === 12) h = 0;
	if (period === "PM" && h !== 12) h += 12;
	return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

interface WheelColumnProps {
	items: (string | number)[];
	selectedIndex: number;
	onSelect: (index: number) => void;
	disabled?: boolean;
	formatItem?: (item: string | number) => string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
	items,
	selectedIndex,
	onSelect,
	disabled,
	formatItem = String,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const isScrollingRef = useRef(false);
	const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	// Scroll to selected index on mount and when selectedIndex changes externally
	useEffect(() => {
		if (containerRef.current && !isScrollingRef.current) {
			const scrollTop = selectedIndex * ITEM_HEIGHT;
			containerRef.current.scrollTo({ top: scrollTop, behavior: "smooth" });
		}
	}, [selectedIndex]);

	const handleScroll = useCallback(() => {
		if (!containerRef.current) return;
		isScrollingRef.current = true;

		if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
		scrollTimeoutRef.current = setTimeout(() => {
			if (!containerRef.current) return;
			const scrollTop = containerRef.current.scrollTop;
			const index = Math.round(scrollTop / ITEM_HEIGHT);
			const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

			// Snap to position
			containerRef.current.scrollTo({
				top: clampedIndex * ITEM_HEIGHT,
				behavior: "smooth",
			});

			isScrollingRef.current = false;
			if (clampedIndex !== selectedIndex) {
				onSelect(clampedIndex);
			}
		}, 100);
	}, [items.length, selectedIndex, onSelect]);

	const handleItemClick = (index: number) => {
		if (disabled) return;
		if (containerRef.current) {
			containerRef.current.scrollTo({
				top: index * ITEM_HEIGHT,
				behavior: "smooth",
			});
		}
		onSelect(index);
	};

	const paddingHeight = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

	return (
		<div
			className="relative overflow-hidden"
			style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
		>
			{/* Selection highlight band */}
			<div
				className="absolute left-0 right-0 border-y border-border bg-accent/50 pointer-events-none z-10"
				style={{
					top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
					height: ITEM_HEIGHT,
				}}
			/>
			{/* Fade overlays */}
			<div
				className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background to-transparent pointer-events-none z-20"
				style={{ height: ITEM_HEIGHT * 1.5 }}
			/>
			<div
				className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pointer-events-none z-20"
				style={{ height: ITEM_HEIGHT * 1.5 }}
			/>
			<div
				ref={containerRef}
				className={cn(
					"h-full overflow-y-auto scrollbar-hide",
					disabled && "opacity-50 pointer-events-none"
				)}
				onScroll={handleScroll}
				style={{
					scrollSnapType: "y mandatory",
				}}
			>
				{/* Top padding */}
				<div style={{ height: paddingHeight }} />
				{items.map((item, index) => (
					<div
						key={`${item}-${index}`}
						className={cn(
							"flex items-center justify-center cursor-pointer transition-colors select-none",
							index === selectedIndex
								? "text-foreground font-semibold text-lg"
								: "text-muted-foreground text-base"
						)}
						style={{
							height: ITEM_HEIGHT,
							scrollSnapAlign: "start",
						}}
						onClick={() => handleItemClick(index)}
					>
						{formatItem(item)}
					</div>
				))}
				{/* Bottom padding */}
				<div style={{ height: paddingHeight }} />
			</div>
		</div>
	);
};

export const ScrollTimePicker: React.FC<ScrollTimePickerProps> = ({
	value,
	onValueChange,
	disabled = false,
	className,
}) => {
	const { hour12, minute, period } = parse24Hour(value || "09:00");

	const hourIndex = HOURS.indexOf(hour12);
	const minuteIndex = MINUTES.indexOf(minute);
	const periodIndex = PERIODS.indexOf(period);

	const handleHourChange = (index: number) => {
		onValueChange(to24Hour(HOURS[index], minute, period));
	};

	const handleMinuteChange = (index: number) => {
		onValueChange(to24Hour(hour12, MINUTES[index], period));
	};

	const handlePeriodChange = (index: number) => {
		onValueChange(to24Hour(hour12, minute, PERIODS[index]));
	};

	return (
		<div
			className={cn(
				"flex items-center rounded-md border border-input bg-background",
				disabled && "opacity-50",
				className
			)}
		>
			<WheelColumn
				items={HOURS}
				selectedIndex={hourIndex >= 0 ? hourIndex : 0}
				onSelect={handleHourChange}
				disabled={disabled}
			/>
			<div className="text-lg font-semibold text-foreground select-none">:</div>
			<WheelColumn
				items={MINUTES}
				selectedIndex={minuteIndex >= 0 ? minuteIndex : 0}
				onSelect={handleMinuteChange}
				disabled={disabled}
				formatItem={(item) => String(item).padStart(2, "0")}
			/>
			<WheelColumn
				items={[...PERIODS]}
				selectedIndex={periodIndex >= 0 ? periodIndex : 0}
				onSelect={handlePeriodChange}
				disabled={disabled}
			/>
		</div>
	);
};
