import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Minus, Plus } from 'lucide-react';

const toDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

function fromDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, width, height) {
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;

    const updatePosition = () => {
      const bounds = triggerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(width, window.innerWidth - 24);
      if (window.innerWidth <= 760 || window.innerHeight <= 640) {
        setPosition({
          mobile: true,
          style: {
            top: '50%',
            left: '50%',
            width: panelWidth,
            maxHeight: window.innerHeight - 32,
            transform: 'translate(-50%, -50%)',
          },
        });
        return;
      }
      const spaceBelow = Math.max(0, window.innerHeight - bounds.bottom - 12);
      const spaceAbove = Math.max(0, bounds.top - 12);
      const openBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
      const availableHeight = openBelow ? spaceBelow : spaceAbove;
      const panelHeight = Math.min(height, Math.max(180, availableHeight));
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - panelWidth - 12));
      const top = openBelow
        ? Math.min(bounds.bottom + 6, window.innerHeight - panelHeight - 12)
        : Math.max(12, bounds.top - panelHeight - 6);
      setPosition({ mobile: false, style: { top, left, width: panelWidth, maxHeight: panelHeight } });
    };
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnScroll = (event) => {
      if (!panelRef.current?.contains(event.target)) setIsOpen(false);
    };

    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [height, isOpen, panelRef, setIsOpen, triggerRef, width]);

  return position;
}

export function DatePicker({ label, value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = fromDateKey(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const selectedDate = fromDateKey(value);
  const generatedId = useId();
  const selectedKey = value || '';
  const datePickerId = id || `date-picker-${generatedId}`;
  const position = usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, 320, 390);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + dayCount) / 7) * 7;
  const calendarDays = useMemo(
    () => Array.from({ length: cellCount }, (_, index) => new Date(year, month, index - firstDay + 1, 12)),
    [cellCount, firstDay, month, year],
  );
  const todayKey = toDateKey(new Date());

  const chooseDate = (date) => {
    onChange(toDateKey(date));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const shiftMonth = (delta) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <div className="min-w-0">
      <label className="mt-[15px] mb-[7px] block text-[11px] font-bold text-[var(--ink)]" htmlFor={datePickerId}>{label}</label>
      <button
        ref={triggerRef}
        id={datePickerId}
        className="flex min-h-[41px] w-full min-w-0 items-center gap-[9px] rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] text-left !text-[12px] !text-[var(--ink)] transition-all duration-300 hover:border-[var(--green)] hover:bg-[var(--surface)] aria-expanded:border-[var(--green)] aria-expanded:shadow-[0_0_0_2px_color-mix(in_srgb,var(--green),transparent_86%)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:!text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:aria-expanded:border-[var(--accent-cyan)] dark:aria-expanded:shadow-[0_0_0_2px_rgba(6,182,212,.18)] max-[760px]:min-h-[44px]"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${datePickerId}-calendar`}
        onClick={() => {
          if (selectedDate) setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
          setIsOpen((open) => !open);
        }}
      >
        <CalendarDays className="shrink-0 text-[var(--green)]" size={16} aria-hidden="true" />
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--ink)]">{selectedDate ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Choose a date'}</span>
        <ChevronDown className="shrink-0 text-[var(--muted)]" size={15} aria-hidden="true" />
      </button>
      {isOpen && position && createPortal(
        <div
          className={position.mobile ? 'fixed inset-0 z-[64] grid place-items-center bg-[rgba(19,27,23,.5)] p-3 backdrop-blur-[3px]' : 'contents'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={panelRef}
            id={`${datePickerId}-calendar`}
            className="fixed z-[65] overflow-y-auto overscroll-contain rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[15px] text-[var(--ink)] shadow-[0_18px_48px_rgba(28,39,33,.22)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px] max-[760px]:rounded-xl max-[760px]:p-[13px]"
            style={position.style}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
          >
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <strong className="font-['Manrope',sans-serif] text-[14px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
            <div className="flex gap-[5px]">
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-10" type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-10" type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button>
            </div>
          </div>
          <div className="mb-[5px] grid grid-cols-7 gap-[3px]" aria-hidden="true">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span className="grid h-[30px] place-items-center text-[10px] font-bold text-[var(--muted)]" key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-[3px]">
            {calendarDays.map((date) => {
              const dayKey = toDateKey(date);
              const isCurrentMonth = date.getMonth() === month;
              return (
                <button
                  key={dayKey}
                  type="button"
                  className={`grid aspect-square min-w-0 place-items-center rounded-[9px] border border-transparent bg-transparent !text-[12px] !text-[var(--ink)] hover:bg-[var(--surface-muted)] max-[760px]:rounded-lg dark:rounded-[var(--radius-sm)] ${dayKey === selectedKey ? 'border-[var(--green)] bg-[var(--green)] !text-white dark:border-[var(--accent-cyan)] dark:bg-[rgba(6,182,212,.15)] dark:!text-[var(--accent-cyan)]' : dayKey === todayKey ? 'border-[var(--accent)] !font-bold !text-[var(--accent-hover)]' : !isCurrentMonth ? '!text-[var(--muted)] opacity-[.62]' : ''}`}
                  aria-label={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-pressed={dayKey === selectedKey}
                  onClick={() => chooseDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-[var(--line)] pt-[10px] dark:border-[var(--border-color)]">
            <button type="button" className="min-h-[34px] rounded-lg bg-transparent px-[10px] !text-[11px] !font-bold !text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:!text-[var(--accent-hover)] max-[760px]:min-h-10" onClick={() => { onChange(''); setIsOpen(false); }}>Clear date</button>
            <button type="button" className="min-h-[34px] rounded-lg bg-[var(--green-soft)] px-[10px] !text-[11px] !font-bold !text-[var(--green)] max-[760px]:min-h-10" onClick={() => chooseDate(new Date())}>Today</button>
          </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

function timeParts(value) {
  if (!value) return { hour: 9, minute: 0, period: 'AM' };
  const [hourString, minuteString] = value.split(':');
  const twentyFourHour = Number(hourString);
  return {
    hour: twentyFourHour % 12 || 12,
    minute: Number(minuteString),
    period: twentyFourHour >= 12 ? 'PM' : 'AM',
  };
}

function toTimeValue(hour, minute, period) {
  const twentyFourHour = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(twentyFourHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePicker({ label, value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState(() => timeParts(value));
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const generatedId = useId();
  const timePickerId = id || `time-picker-${generatedId}`;
  const position = usePopoverPosition(isOpen, setIsOpen, triggerRef, panelRef, 300, 245);

  const updateParts = (nextParts) => {
    setParts(nextParts);
    onChange(toTimeValue(nextParts.hour, nextParts.minute, nextParts.period));
  };
  const adjust = (key, delta) => {
    const current = timeParts(value || toTimeValue(parts.hour, parts.minute, parts.period));
    const nextValue = key === 'hour'
      ? ((current.hour - 1 + delta + 12) % 12) + 1
      : (current.minute + delta + 60) % 60;
    updateParts({ ...current, [key]: nextValue });
  };
  const displayedParts = timeParts(value || toTimeValue(parts.hour, parts.minute, parts.period));

  return (
    <div className="min-w-0">
      <label className="mt-[15px] mb-[7px] block text-[11px] font-bold text-[var(--ink)]" htmlFor={timePickerId}>{label}</label>
      <button
        ref={triggerRef}
        id={timePickerId}
        className="flex min-h-[41px] w-full min-w-0 items-center gap-[9px] rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] text-left !text-[12px] !text-[var(--ink)] transition-all duration-300 hover:border-[var(--green)] hover:bg-[var(--surface)] aria-expanded:border-[var(--green)] aria-expanded:shadow-[0_0_0_2px_color-mix(in_srgb,var(--green),transparent_86%)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:!text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:aria-expanded:border-[var(--accent-cyan)] dark:aria-expanded:shadow-[0_0_0_2px_rgba(6,182,212,.18)] max-[760px]:min-h-[44px]"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${timePickerId}-picker`}
        onClick={() => {
          setParts(timeParts(value));
          setIsOpen((open) => !open);
        }}
      >
        <Clock3 className="shrink-0 text-[var(--green)]" size={16} aria-hidden="true" />
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--ink)]">{value ? new Date(2000, 0, 1, ...value.split(':').map(Number)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Choose a time'}</span>
        <ChevronDown className="shrink-0 text-[var(--muted)]" size={15} aria-hidden="true" />
      </button>
      {isOpen && position && createPortal(
        <div
          className={position.mobile ? 'fixed inset-0 z-[64] grid place-items-center bg-[rgba(19,27,23,.5)] p-3 backdrop-blur-[3px]' : 'contents'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={panelRef}
            id={`${timePickerId}-picker`}
            className="fixed z-[65] overflow-y-auto overscroll-contain rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[15px] text-[var(--ink)] shadow-[0_18px_48px_rgba(28,39,33,.22)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px] max-[760px]:rounded-xl max-[760px]:p-[13px]"
            style={position.style}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
          >
          <strong className="mb-[14px] block font-['Manrope',sans-serif] text-[14px] font-bold dark:font-sans dark:text-[var(--text-primary)]">Choose a time</strong>
          <div className="grid grid-cols-[minmax(65px,1fr)_12px_minmax(65px,1fr)_auto] items-center gap-[6px]">
            <div className="grid justify-items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--muted)]">Hour</span>
              <button className="grid h-8 w-[38px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-[42px]" type="button" onClick={() => adjust('hour', 1)} aria-label="Increase hour"><Plus size={15} /></button>
              <strong className="font-['Manrope',sans-serif] text-2xl font-bold tabular-nums dark:font-sans dark:text-[var(--text-primary)]" aria-live="polite">{String(displayedParts.hour).padStart(2, '0')}</strong>
              <button className="grid h-8 w-[38px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-[42px]" type="button" onClick={() => adjust('hour', -1)} aria-label="Decrease hour"><Minus size={15} /></button>
            </div>
            <span className="mt-[18px] self-center font-['Manrope',sans-serif] text-xl font-bold text-[var(--muted)] dark:font-sans dark:text-[var(--text-primary)]">:</span>
            <div className="grid justify-items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--muted)]">Minute</span>
              <button className="grid h-8 w-[38px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-[42px]" type="button" onClick={() => adjust('minute', 1)} aria-label="Increase minute"><Plus size={15} /></button>
              <strong className="font-['Manrope',sans-serif] text-2xl font-bold tabular-nums dark:font-sans dark:text-[var(--text-primary)]" aria-live="polite">{String(displayedParts.minute).padStart(2, '0')}</strong>
              <button className="grid h-8 w-[38px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-10 max-[760px]:w-[42px]" type="button" onClick={() => adjust('minute', -1)} aria-label="Decrease minute"><Minus size={15} /></button>
            </div>
            <div className="mt-[18px] grid gap-[6px]">
              {['AM', 'PM'].map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`min-h-9 min-w-12 rounded-lg border border-[var(--line)] bg-[var(--surface)] !text-[11px] !font-bold !text-[var(--muted)] dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:!text-[var(--text-primary)] max-[760px]:min-h-[42px] max-[760px]:min-w-[52px] ${displayedParts.period === period ? 'border-[var(--green)] bg-[var(--green-soft)] !text-[var(--green)] dark:border-[var(--accent-cyan)] dark:bg-[rgba(6,182,212,.15)] dark:!text-[var(--accent-cyan)]' : ''}`}
                  aria-pressed={displayedParts.period === period}
                  onClick={() => updateParts({ ...displayedParts, period })}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-[var(--line)] pt-[10px] dark:border-[var(--border-color)]">
            <button type="button" className="min-h-[34px] rounded-lg bg-transparent px-[10px] !text-[11px] !font-bold !text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:!text-[var(--accent-hover)] max-[760px]:min-h-10" onClick={() => { onChange(''); setIsOpen(false); }}>Clear time</button>
            <button type="button" className="min-h-[34px] rounded-lg bg-[var(--green-soft)] px-[10px] !text-[11px] !font-bold !text-[var(--green)] max-[760px]:min-h-10" onClick={() => { onChange(toTimeValue(displayedParts.hour, displayedParts.minute, displayedParts.period)); setIsOpen(false); triggerRef.current?.focus(); }}>Done</button>
          </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
