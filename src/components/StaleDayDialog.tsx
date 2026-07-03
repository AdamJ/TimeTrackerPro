import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/scroll-time-picker";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { AlertTriangle } from "lucide-react";

function formatDateLabel(date: Date): string {
	return date.toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric"
	});
}

export const StaleDayDialog: React.FC = () => {
	const { isDayStale, dayStartTime, endDay, discardDay } = useTimeTracking();
	const [selectedTime, setSelectedTime] = useState("23:59");

	useEffect(() => {
		if (isDayStale) {
			setSelectedTime("23:59");
		}
	}, [isDayStale]);

	const handleEndDay = () => {
		if (!dayStartTime) return;
		const [hours, minutes] = selectedTime.split(":").map(Number);
		const endDateTime = new Date(dayStartTime);
		endDateTime.setHours(hours, minutes, 0, 0);
		endDay(endDateTime);
	};

	return (
		<Dialog open={isDayStale} onOpenChange={() => {}}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle aria-hidden="true" className="w-5 h-5 text-warning" />
						<span>Unfinished Work Day</span>
					</DialogTitle>
					<DialogDescription>
						You have an open work day from{" "}
						<strong>{dayStartTime ? formatDateLabel(dayStartTime) : "a previous day"}</strong>.
						When did you finish working? This dialog can't be dismissed with Escape or by
						clicking outside — choose "Discard Day" or "End Day" below to continue.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<Label htmlFor="stale-end-time">End Time</Label>
					<TimePicker
						id="stale-end-time"
						value={selectedTime}
						onValueChange={setSelectedTime}
						aria-label="Select the time you finished working"
					/>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={discardDay}
						className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
					>
						Discard Day
					</Button>
					<Button onClick={handleEndDay}>
						End Day at {selectedTime}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
