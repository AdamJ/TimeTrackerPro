// src/components/SummaryOutput.tsx
// Output panel for the /report page: Edit/Preview toggle, editable textarea,
// markdown preview, and export row (copy, download .txt, print/PDF).

import { useState } from "react";
import {
	ReloadIcon,
	ClipboardCopyIcon,
	CheckIcon,
} from "@radix-ui/react-icons";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryOutputProps {
	summary: string;
	weekLabel: string;
	onUpdate: (v: string) => void;
	onRegenerate: () => void;
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}).catch(() => {
			// clipboard unavailable — leave button in default state
		});
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopy}
			className="gap-1.5 transition-all"
		>
			{copied ? (
				<>
					<CheckIcon className="h-3.5 w-3.5 text-chart-2" />
					<span className="text-chart-2">Copied</span>
				</>
			) : (
				<>
					<ClipboardCopyIcon className="h-3.5 w-3.5" />
					Copy
				</>
			)}
		</Button>
	);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function slugifyLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function downloadAsTxt(text: string, weekLabel: string): void {
	const blob = new Blob([text], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `summary-${slugifyLabel(weekLabel)}.txt`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Print helper
// ---------------------------------------------------------------------------

function printSummary(): void {
	if (document.body.classList.contains("print-summary-mode")) return;
	document.body.classList.add("print-summary-mode");
	const cleanup = () => {
		document.body.classList.remove("print-summary-mode");
		window.removeEventListener("afterprint", cleanup);
	};
	window.addEventListener("afterprint", cleanup);
	window.print();
}

// ---------------------------------------------------------------------------
// SummaryOutput
// ---------------------------------------------------------------------------

export default function SummaryOutput({
	summary,
	weekLabel,
	onUpdate,
	onRegenerate,
}: SummaryOutputProps) {
	const [mode, setMode] = useState<"edit" | "preview">("edit");

	return (
		<div className="space-y-2 animate-slideUpAndFade">
			{/* Header row */}
			<div className="flex items-center justify-between">
				<Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Summary
				</Label>
				<div className="flex items-center gap-1">
					{/* Edit / Preview toggle */}
					<div className="flex items-center rounded-md border overflow-hidden">
						<Button
							variant={mode === "edit" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-none h-7 px-2.5 text-xs"
							onClick={() => setMode("edit")}
							aria-pressed={mode === "edit"}
						>
							Edit
						</Button>
						<Button
							variant={mode === "preview" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-none h-7 px-2.5 text-xs border-l"
							onClick={() => setMode("preview")}
							aria-pressed={mode === "preview"}
						>
							Preview
						</Button>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onRegenerate}
						className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
					>
						<ReloadIcon className="h-3 w-3" />
						Regenerate
					</Button>
				</div>
			</div>

			{/* Content area — also the print target */}
			<div className="summary-print-region">
				{mode === "edit" ? (
					<Textarea
						value={summary}
						onChange={e => onUpdate(e.target.value)}
						className="min-h-[160px] text-sm resize-none leading-relaxed focus-visible:ring-1 bg-muted/20"
						aria-label="Generated weekly summary — editable before exporting"
					/>
				) : (
					<div className="min-h-[160px] rounded-md border bg-muted/20 px-3 py-2">
						<MarkdownDisplay content={summary} />
					</div>
				)}
			</div>

			{/* Export row */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<CopyButton text={summary} />
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => downloadAsTxt(summary, weekLabel)}
					aria-label="Download summary as text file"
				>
					<Download className="h-3.5 w-3.5" />
					Download .txt
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={printSummary}
					aria-label="Print or save as PDF"
				>
					<Printer className="h-3.5 w-3.5" />
					Print / PDF
				</Button>
			</div>

			<p className="text-xs text-muted-foreground">
				Edit before exporting. Changes are auto-saved.
			</p>
		</div>
	);
}
