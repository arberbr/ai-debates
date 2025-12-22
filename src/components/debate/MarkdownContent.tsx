import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => (
  <div
    className={`prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-foreground/90 ${className || ""}`}
  >
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-4 last:mb-0 leading-7 text-foreground/90">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside mb-4 space-y-2 ml-6 pl-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside mb-4 space-y-2 ml-6 pl-2">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mb-3 mt-4 first:mt-0 text-foreground">
            {children}
          </h3>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted/80 px-1.5 py-0.5 rounded-sm text-xs font-mono text-foreground border border-border">
              {children}
            </code>
          ) : (
            <code className="block bg-muted/80 p-3 rounded-md text-xs font-mono overflow-x-auto mb-4 border border-border">
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/40 pl-4 italic my-4 text-muted-foreground bg-muted/30 py-3 rounded-r-lg">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-primary underline hover:text-primary/80 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
