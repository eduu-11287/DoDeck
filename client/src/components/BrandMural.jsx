export default function BrandMural() {
  return (
    <div className="pointer-events-none fixed right-[-3vw] bottom-[2vh] z-0 h-[48vh] w-[min(55vw,760px)] text-[var(--green)] opacity-20 max-[760px]:top-[24vh] max-[760px]:right-[-36vw] max-[760px]:bottom-auto max-[760px]:h-[60vh] max-[760px]:w-[90vw] max-[760px]:opacity-[.08] dark:opacity-90" aria-hidden="true">
      <span className="absolute right-[1vw] bottom-[4vh] grid rotate-[-4deg] bg-[linear-gradient(180deg,rgba(6,182,212,.15),transparent)] bg-clip-text text-right text-[7vw] font-extrabold uppercase leading-[.92] text-transparent [-webkit-background-clip:text]">Make room<br />for what<br />matters.</span>
      <svg className="absolute inset-0 h-full w-full overflow-hidden" viewBox="0 0 620 560" role="presentation">
        <path className="fill-none stroke-[var(--accent)] stroke-[2.4px] [stroke-linecap:round] [stroke-linejoin:round] opacity-[.42]" d="M72 108c76-63 146-29 185-66 23-22 46-14 55 4" />
        <path className="fill-none stroke-[var(--green)] stroke-[2.4px] [stroke-linecap:round] [stroke-linejoin:round] opacity-[.42]" d="M114 473c102 45 230 13 328 43 28 9 54 4 79-13" />
        <path className="fill-none stroke-[var(--accent)] stroke-[2.4px] [stroke-dasharray:7_10] [stroke-linecap:round] [stroke-linejoin:round] opacity-[.28]" d="M405 82c99 19 155 100 133 172-17 54-87 65-127 32" />
        <path className="stroke-[var(--accent)] stroke-[1.5px] [stroke-linecap:round] [stroke-linejoin:round] [fill:color-mix(in_srgb,var(--accent),transparent_90%)] opacity-[.42]" d="m501 355 8 24 23 8-23 8-8 24-8-24-24-8 24-8z" />
        <circle className="fill-[var(--accent)] opacity-40" cx="91" cy="256" r="5" />
        <circle className="fill-[var(--accent)] opacity-40" cx="545" cy="235" r="4" />
      </svg>
    </div>
  );
}
