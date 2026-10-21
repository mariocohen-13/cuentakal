import { useEffect, useState, type ReactNode } from 'react';
import type { Accuracy, Macros } from '../lib/types';
import { fmt, r1 } from '../lib/macros';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Icon = {
  today: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 8 8" strokeWidth={3} /></svg>),
  menu: () => (<svg viewBox="0 0 24 24" {...P}><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8" /></svg>),
  history: () => (<svg viewBox="0 0 24 24" {...P}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>),
  settings: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>),
  plus: () => (<svg viewBox="0 0 24 24" {...P}><path d="M12 5v14M5 12h14" /></svg>),
  left: () => (<svg viewBox="0 0 24 24" {...P}><path d="M15 18l-6-6 6-6" /></svg>),
  right: () => (<svg viewBox="0 0 24 24" {...P}><path d="M9 18l6-6-6-6" /></svg>),
  close: () => (<svg viewBox="0 0 24 24" {...P}><path d="M18 6L6 18M6 6l12 12" /></svg>),
  star: ({ on }: { on?: boolean }) => (<svg viewBox="0 0 24 24" {...P} fill={on ? 'currentColor' : 'none'}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>),
};

export const COLORS = { kcal: 'var(--kcal)', protein: 'var(--protein)', carbs: 'var(--carbs)', fat: 'var(--fat)' };
export const LABELS = { kcal: 'Calorías', protein: 'Proteínas', carbs: 'Carbohidratos', fat: 'Grasas' };

export function Ring({ value, goal, size = 150, stroke = 16 }: { value: number; goal: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? value / goal : 0;
  const first = Math.min(pct, 1);
  const extra = Math.min(Math.max(pct - 1, 0), 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--kcal)" strokeOpacity={0.15} strokeWidth={stroke} />
      {first > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--kcal)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${first * c} ${c}`} style={{ transition: 'stroke-dasharray .4s ease' }} />
      )}
      {extra > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#b00030" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${extra * c} ${c}`} />
      )}
    </svg>
  );
}

export function MacroBar({ k, value, goal, unit = 'g' }: { k: keyof Macros; value: number; goal: number; unit?: string }) {
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const left = goal - value;
  return (
    <div className="macro">
      <div className="macro-head">
        <span><span className="dot" style={{ background: COLORS[k] }} /> <b>{LABELS[k]}</b></span>
        <span className="num">
          <b>{fmt(value)}</b><span className="muted"> / {fmt(goal)} {unit}</span>
          <span className="muted"> · </span>
          {left >= 0 ? <span>quedan <b>{fmt(left)}</b></span> : <span style={{ color: 'var(--danger)' }}>+{fmt(-left)}</span>}
        </span>
      </div>
      <div className={`bar ${pct > 100 ? 'over' : ''}`}>
        <span style={{ width: `${Math.min(pct, 100)}%`, background: COLORS[k] }} />
      </div>
    </div>
  );
}

export function AccuracyBadge({ a, builtin }: { a: Accuracy; builtin?: boolean }) {
  if (a === 'estimate') return <span className="badge estimate" title="Valor estimado: puede no ser exacto">Estimación</span>;
  return <span className="badge known" title={builtin ? 'Valor de referencia genérico' : 'Dato conocido'}>{builtin ? 'Referencia' : 'Dato'}</span>;
}

export function MacroLine({ m }: { m: Macros }) {
  return (
    <span className="num">
      {fmt(m.kcal)} kcal · P {r1(m.protein)} · C {r1(m.carbs)} · G {r1(m.fat)}
    </span>
  );
}

export function MacroTiles({ m }: { m: Macros }) {
  return (
    <div className="macro-tiles">
      <div><b style={{ color: COLORS.kcal }}>{fmt(m.kcal)}</b><span>kcal</span></div>
      <div><b style={{ color: COLORS.protein }}>{r1(m.protein)}</b><span>prot. g</span></div>
      <div><b style={{ color: COLORS.carbs }}>{r1(m.carbs)}</b><span>hidr. g</span></div>
      <div><b style={{ color: COLORS.fat }}>{r1(m.fat)}</b><span>grasa g</span></div>
    </div>
  );
}

export function Sheet({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          {actions}
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon.close /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)} type="button">{o.l}</button>
      ))}
    </div>
  );
}

/** Campo numérico que acepta coma decimal y no fuerza el valor mientras se escribe. */
export function NumInput({ value, onChange, step, min = 0, ...rest }: { value: number; onChange: (n: number) => void; step?: number; min?: number; autoFocus?: boolean; id?: string; placeholder?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseNum(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      inputMode="decimal"
      value={text}
      step={step}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNum(e.target.value);
        if (!isNaN(n) && n >= min) onChange(n);
      }}
      {...rest}
    />
  );
}

export function parseNum(s: string): number {
  const t = s.replace(',', '.').trim();
  if (t === '') return 0;
  return Number(t);
}

let toastFn: ((s: string) => void) | null = null;
export function toast(s: string) {
  toastFn?.(s);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    toastFn = (s) => {
      setMsg(s);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2200);
    };
    return () => { toastFn = null; clearTimeout(t); };
  }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}
