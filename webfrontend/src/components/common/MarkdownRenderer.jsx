import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  return (
    <div className={`text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-lg sm:text-xl font-black mt-4 mb-2 text-slate-900 dark:text-white" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-base sm:text-lg font-bold mt-3 mb-1.5 text-slate-900 dark:text-white" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm sm:text-base font-semibold mt-2 mb-1 text-slate-900 dark:text-white" {...props} />
          ),
          p: ({ node, ...props }) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1 marker:text-primary-500" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1 marker:text-primary-500" {...props} />
          ),
          li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-slate-900 dark:text-white" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-primary-600 dark:text-primary-400 font-semibold underline underline-offset-2 hover:text-primary-700"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, inline, ...props }) => (
            <code
              className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-primary-600 dark:text-primary-400 font-semibold"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary-500 pl-3 italic my-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 py-1 rounded-r"
              {...props}
            />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
