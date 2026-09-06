import ReactMarkdown from "react-markdown";
import { parseMidaCriteria, splitEsgDialogContent } from "@/lib/esgMapping";

const sectionClass = "rounded-xl border border-[#dde5de] bg-[#f8faf7] px-4 py-3.5";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="h-3.5 w-0.5 rounded-full bg-[#63816d]" />
      <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#52705e]">{children}</h4>
    </div>
  );
}

export default function EsgSuggestionsContent({ markdown }: { markdown: string }) {
  const sections = splitEsgDialogContent(markdown);
  const midaCriteria = parseMidaCriteria(sections.mida);

  return (
    <div className="space-y-3">
      {sections.sarawak && <section className={sectionClass}>
        <SectionHeading>Sarawak 13th Malaysia Plan</SectionHeading>
        <ReactMarkdown components={{
          ul: ({ children }) => <ul className="space-y-1.5 pl-4 text-[13px] leading-5 text-[#536159] [list-style-type:disc] marker:text-[#7d9886]">{children}</ul>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          p: ({ children }) => <p className="text-[13px] leading-5 text-[#536159]">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-[#405449]">{children}</strong>,
          em: ({ children }) => <span className="text-[#637168]">{children}</span>,
        }}>{sections.sarawak}</ReactMarkdown>
      </section>}

      {midaCriteria.length > 0 && <section className={sectionClass}>
        <SectionHeading>MIDA ESG</SectionHeading>
        <div className="space-y-4">
          {midaCriteria.map((mapping, index) => <div key={`${mapping.criterion}-${index}`} className={index > 0 ? "border-t border-[#e0e7e1] pt-4" : ""}>
            <h5 className="mb-2 text-[13px] font-bold text-[#304b3a]">{mapping.criterion}</h5>
            <dl className="space-y-1.5">
              {mapping.fields.map((field) => <div key={field.label} className="grid gap-0.5 text-[12.5px] leading-5 sm:grid-cols-[9.5rem_1fr] sm:gap-2.5">
                <dt className="font-semibold text-[#52665a]">{field.label}</dt>
                <dd className="text-[#647169]">{field.value}</dd>
              </div>)}
            </dl>
          </div>)}
        </div>
      </section>}

      {sections.suggestions && <section className={sectionClass}>
        <SectionHeading>Materials &amp; Suggestions</SectionHeading>
        <ReactMarkdown components={{
          p: ({ children }) => <p className="mb-1.5 text-[13px] font-semibold leading-5 text-[#405449] last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2.5 space-y-0.5 pl-4 text-[12.5px] leading-5 text-[#647169] [list-style-type:disc] last:mb-0 marker:text-[#9aaa9e]">{children}</ul>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[#405449]">{children}</strong>,
        }}>{sections.suggestions}</ReactMarkdown>
      </section>}
    </div>
  );
}
