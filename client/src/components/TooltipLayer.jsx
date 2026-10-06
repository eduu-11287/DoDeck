import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_TARGET = '[data-tooltip], button[aria-label], a[aria-label]';
const TOOLTIP_DELAY = 420;

function findTooltipTarget(node) {
  if (!(node instanceof Element)) return null;
  const target = node.closest(TOOLTIP_TARGET);
  if (!target) return null;
  if (!target.closest('.side-nav-dock.collapsed') && target.matches('.nav-item, .dock-toggle')) return null;

  const text = target.dataset.tooltip || target.getAttribute('aria-label');
  return text ? { target, text } : null;
}

export default function TooltipLayer() {
  const [tooltip, setTooltip] = useState(null);
  const timer = useRef(null);
  const activeTarget = useRef(null);
  const describedTarget = useRef(null);
  const previousDescription = useRef(null);

  useEffect(() => {
    const clearDescription = () => {
      if (!describedTarget.current) return;
      if (previousDescription.current) {
        describedTarget.current.setAttribute('aria-describedby', previousDescription.current);
      } else {
        describedTarget.current.removeAttribute('aria-describedby');
      }
      describedTarget.current = null;
      previousDescription.current = null;
    };
    const hide = () => {
      window.clearTimeout(timer.current);
      clearDescription();
      activeTarget.current = null;
      setTooltip(null);
    };

    const showAfterDelay = (target, text) => {
      window.clearTimeout(timer.current);
      clearDescription();
      activeTarget.current = target;
      setTooltip(null);
      timer.current = window.setTimeout(() => {
        if (!target.isConnected) return;
        const bounds = target.getBoundingClientRect();
        const below = bounds.top < 56;
        const existingDescription = target.getAttribute('aria-describedby');
        describedTarget.current = target;
        previousDescription.current = existingDescription;
        target.setAttribute('aria-describedby', [existingDescription, 'daymark-tooltip'].filter(Boolean).join(' '));
        const maxHalfWidth = Math.min(140, window.innerWidth / 2 - 12);
        setTooltip({
          text,
          left: Math.min(Math.max(bounds.left + bounds.width / 2, maxHalfWidth), window.innerWidth - maxHalfWidth),
          top: below ? bounds.bottom + 9 : bounds.top - 9,
          placement: below ? 'below' : 'above',
        });
      }, TOOLTIP_DELAY);
    };

    const onPointerOver = (event) => {
      if (event.pointerType === 'touch') return;
      const match = findTooltipTarget(event.target);
      if (!match || match.target === activeTarget.current) return;
      showAfterDelay(match.target, match.text);
    };
    const onPointerOut = (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest(TOOLTIP_TARGET);
      if (!target || target === event.relatedTarget || target.contains(event.relatedTarget)) return;
      if (target === activeTarget.current) hide();
    };
    const onFocusIn = (event) => {
      const match = findTooltipTarget(event.target);
      if (match && match.target.matches(':focus-visible')) showAfterDelay(match.target, match.text);
    };
    const onFocusOut = (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest(TOOLTIP_TARGET);
      if (!target || target === event.relatedTarget || target.contains(event.relatedTarget)) return;
      if (target === activeTarget.current) hide();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') hide();
    };
    const onResize = () => {
      if (activeTarget.current) {
        const match = findTooltipTarget(activeTarget.current);
        if (match) showAfterDelay(match.target, match.text);
        else hide();
      }
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', hide, true);
    return () => {
      hide();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tooltip) return null;
  return createPortal(
    <div
      id="daymark-tooltip"
      className={`pointer-events-none fixed z-[1000] max-w-[min(260px,calc(100vw-24px))] rounded-[9px] border border-[rgba(255,255,255,.08)] bg-[#26342e] px-[11px] py-2 text-center text-[11px] font-semibold leading-[1.4] whitespace-normal text-[#f9fbf8] shadow-[0_8px_24px_rgba(15,23,18,.2)] animate-[tooltip-enter_.12s_ease-out_both] before:absolute before:left-1/2 before:h-[7px] before:w-[7px] before:-translate-x-1/2 before:rotate-45 before:bg-[#26342e] before:content-[''] dark:border-[var(--border-color)] dark:bg-[var(--bg-card-hover)] dark:text-[var(--text-primary)] dark:before:border-[var(--border-color)] dark:before:bg-[var(--bg-card-hover)] ${tooltip.placement === 'above' ? '-translate-x-1/2 -translate-y-full before:bottom-[-4px] before:border-r before:border-b' : '-translate-x-1/2 before:top-[-4px] before:border-t before:border-l'}`}
      role="tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.text}
    </div>,
    document.body,
  );
}
