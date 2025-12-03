import DOMPurify from 'dompurify';

interface BlogContentProps {
  content: string;
}

export const BlogContent = ({ content }: BlogContentProps) => {
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u',
      'blockquote', 'pre', 'code', 'img', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'target',
      'rel', 'width', 'height', 'style'
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });

  return (
    <div 
      className="blog-content prose prose-lg max-w-none
        prose-headings:text-foreground 
        prose-h2:text-3xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
        prose-h2:border-b-2 prose-h2:border-sky-blue prose-h2:pb-2
        prose-h3:text-2xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
        prose-a:text-sky-blue prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:text-sky-blue prose-code:bg-sky-blue/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-pre:bg-muted prose-pre:border prose-pre:border-border
        prose-blockquote:border-l-4 prose-blockquote:border-sky-blue prose-blockquote:bg-sky-blue/5 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic
        prose-ul:list-disc prose-ul:pl-6
        prose-ol:list-decimal prose-ol:pl-6
        prose-li:text-foreground/90 prose-li:mb-2
        prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
        prose-hr:border-border prose-hr:my-8
        prose-table:border-collapse prose-table:w-full
        prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
        prose-td:border prose-td:border-border prose-td:p-3"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};
