import ReactMarkdown from "react-markdown";

export default function GuideContent({ markdown }: { markdown: string }) {
  return (
    <section className="rounded-xl border border-[#dde5de] bg-[#f8faf7] px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="h-3.5 w-0.5 rounded-full bg-[#63816d]" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#52705e]">GBI Requirement</h4>
      </div>
      <div className="text-[13px] leading-5 text-[#536159]">
        <ReactMarkdown components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1.5 pl-4 [list-style-type:disc] marker:text-[#7d9886]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1.5 pl-4">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-[#405449]">{children}</strong>,
          em: ({ children }) => <em className="text-[#637168]">{children}</em>,
          h1: ({ children }) => <h5 className="mb-2 text-[13px] font-bold text-[#304b3a]">{children}</h5>,
          h2: ({ children }) => <h5 className="mb-2 text-[13px] font-bold text-[#304b3a]">{children}</h5>,
          h3: ({ children }) => <h5 className="mb-2 text-[13px] font-bold text-[#304b3a]">{children}</h5>,
        }}>
          {markdown.replaceAll("\\n", "\n").trim()}
        </ReactMarkdown>
      </div>
    </section>
  );
}
