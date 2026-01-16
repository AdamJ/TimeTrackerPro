import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownDisplayProps {
	content: string;
	className?: string;
}

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, className = "" }) => {
	return (
		<div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// Customize markdown rendering for better UI integration
					p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
					ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
					ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
					li: ({ children }) => <li className="mb-1">{children}</li>,
					code: ({ children }) => (
						<code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
					),
					pre: ({ children }) => (
						<pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{children}</pre>
					),
					a: ({ href, children }) => (
						<a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
							{children}
						</a>
					),
					h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
					h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
					h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
					blockquote: ({ children }) => (
						<blockquote className="border-l-4 border-muted pl-3 italic">{children}</blockquote>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
};
