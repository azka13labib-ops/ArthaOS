"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function stripAllEmojis(str: string): string {
  if (!str) return "";
  return str
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
    .replace(/[✨🎉💥☕🥐💰🛍️📍📞👉🙏😊🌟✅⏱️➡️⭐]/g, "")
    .replace(/[ \t]{2,}/g, " ");
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const cleanContent = stripAllEmojis(content);

  return (
    <div className={`prose-sm max-w-none text-slate-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-950 mt-4 mb-2 first:mt-0 pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-slate-900 mt-3.5 mb-2 first:mt-0 pb-1 border-b border-slate-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-slate-900 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed text-slate-800 text-xs mb-2.5 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-slate-600 italic">
              {children}
            </em>
          ),
          hr: () => (
            <hr className="my-3.5 border-slate-200" />
          ),
          blockquote: ({ children }) => (
            <div className="my-2.5 p-3 border-l-4 border-emerald-500 bg-emerald-50/70 rounded-r-xl text-xs text-emerald-950 shadow-2xs">
              {children}
            </div>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2.5 space-y-1 text-xs text-slate-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2.5 space-y-1 text-xs text-slate-800">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/80 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs text-slate-800">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[11px] bg-slate-100 border border-slate-200 text-slate-900 px-1.5 py-0.5 rounded">
              {children}
            </code>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
