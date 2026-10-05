export default function HighlightedText({ children, query }) {
  const text = String(children ?? '');
  const search = query.trim();
  if (!search) return text;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) => (
    part.toLowerCase() === search.toLowerCase()
      ? <mark className="search-match" key={`${part}-${index}`}>{part}</mark>
      : part
  ));
}
