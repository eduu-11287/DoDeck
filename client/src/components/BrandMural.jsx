export default function BrandMural() {
  return (
    <div className="brand-mural" aria-hidden="true">
      <span className="brand-mural-watermark">Make room<br />for what<br />matters.</span>
      <svg viewBox="0 0 620 560" role="presentation">
        <path className="mural-scribble mural-scribble-one" d="M72 108c76-63 146-29 185-66 23-22 46-14 55 4" />
        <path className="mural-scribble mural-scribble-two" d="M114 473c102 45 230 13 328 43 28 9 54 4 79-13" />
        <path className="mural-orbit" d="M405 82c99 19 155 100 133 172-17 54-87 65-127 32" />
        <path className="mural-spark" d="m501 355 8 24 23 8-23 8-8 24-8-24-24-8 24-8z" />
        <circle className="mural-dot" cx="91" cy="256" r="5" />
        <circle className="mural-dot" cx="545" cy="235" r="4" />
      </svg>
    </div>
  );
}
