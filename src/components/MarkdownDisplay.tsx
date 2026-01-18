import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert
      prose-p:leading-relaxed prose-p:my-1
      prose-li:my-0.5 prose-li:marker:text-blue-500
      prose-headings:font-bold prose-headings:text-foreground
      prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-foreground prose-strong:font-bold
      prose-pre:bg-muted prose-pre:text-muted-foreground prose-pre:p-2 prose-pre:rounded-lg
      ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-[0.85em] font-medium text-foreground border border-border/50">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
