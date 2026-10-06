export default function ItemDetailLink({ href, onOpen, className, children, ariaLabel }) {
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen();
  };

  return (
    <a className={className} href={href} onClick={handleClick} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
