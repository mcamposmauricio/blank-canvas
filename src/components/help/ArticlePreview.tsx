interface ArticlePreviewProps {
  title: string;
  subtitle: string;
  htmlContent: string;
}

export function ArticlePreview({ title, subtitle, htmlContent }: ArticlePreviewProps) {
  const estimateReadingTime = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  return (
    <div className="light bg-white min-h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight leading-tight" style={{ color: "#0f172a" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg font-light leading-relaxed" style={{ color: "#64748b" }}>
                {subtitle}
              </p>
            )}
            <div className="flex items-center gap-4 mt-5 pt-5" style={{ borderTop: "1px solid #f1f5f9" }}>
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                {estimateReadingTime(htmlContent)} min de leitura
              </span>
            </div>
          </div>
        )}

        {htmlContent ? (
          <div
            className="prose prose-slate max-w-none help-article-content
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:leading-relaxed prose-p:text-[#334155]
              prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-md
              prose-table:text-sm prose-th:bg-[#f8fafc]
              prose-blockquote:border-l-4 prose-blockquote:not-italic
              prose-code:text-sm prose-code:bg-[#f1f5f9] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
              prose-pre:bg-[#1e293b] prose-pre:rounded-xl"
            style={{
              "--tw-prose-links": "#3b82f6",
              "--tw-prose-quotes": "#3b82f6",
              "--tw-prose-quote-borders": "#3b82f6",
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <p className="text-sm italic" style={{ color: "#94a3b8" }}>
            O preview aparecerá aqui conforme você escreve...
          </p>
        )}
      </div>
    </div>
  );
}
