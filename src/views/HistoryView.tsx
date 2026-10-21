import { useState } from 'react';
import { useAppState } from '../lib/store';
import { setWeight } from '../lib/actions';
import { addDays, DAY_NAMES, formatShort, todayKey, weekStart, weekdayIndex } from '../lib/date';
import { STATUS_LABEL, weekSummary } from '../lib/stats';
import { fmt, r1 } from '../lib/macros';
import { Icon, NumInput, toast } from '../components/ui';
import type { WeightEntry } from '../lib/types';

export function HistoryView({ openDay }: { openDay: (d: string) => void }) {
  const s = useAppState();
  const today = todayKey();
  const [ws, setWs] = useState(weekStart(today));
  const sum = weekSummary(s, ws);
  const g = s.goals;
  const prev = weekSummary(s, addDays(ws, -7));
  const isCurrent = ws === weekStart(today);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="sub">{formatShort(ws)} – {formatShort(addDays(ws, 6))}</div>
          <h1>Historial</h1>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => setWs(addDays(ws, -7))} aria-label="Semana anterior"><Icon.left /></button>
          {!isCurrent && <button className="btn small" onClick={() => setWs(weekStart(today))}>Actual</button>}
          <button className="icon-btn" onClick={() => setWs(addDays(ws, 7))} aria-label="Semana siguiente" disabled={isCurrent}><Icon.right /></button>
        </div>
      </div>

      <div className="card">
        <h2>Media semanal <span className="spacer" /><span className="small muted">{sum.daysLogged} de 7 días registrados</span></h2>
        {sum.daysLogged === 0 ? (
          <div className="empty-state">No hay días registrados esta semana.</div>
        ) : (
          <>
            <div className="macro-tiles">
              <div><b style={{ color: 'var(--kcal)' }}>{fmt(sum.avg.kcal)}</b><span>kcal ({pct(sum.avg.kcal, g.kcal)})</span></div>
              <div><b style={{ color: 'var(--protein)' }}>{fmt(sum.avg.protein)}</b><span>prot. ({pct(sum.avg.protein, g.protein)})</span></div>
              <div><b style={{ color: 'var(--carbs)' }}>{fmt(sum.avg.carbs)}</b><span>hidr. ({pct(sum.avg.carbs, g.carbs)})</span></div>
              <div><b style={{ color: 'var(--fat)' }}>{fmt(sum.avg.fat)}</b><span>grasa ({pct(sum.avg.fat, g.fat)})</span></div>
            </div>
            {prev.daysLogged > 0 && (
              <div className="tiny muted mt">Semana anterior: {fmt(prev.avg.kcal)} kcal · P {fmt(prev.avg.protein)} g de media ({prev.daysLogged} días).</div>
            )}
            <div className="tiny muted mt">Las medias solo cuentan los días con registros: un día sin registrar no se cuenta como 0.</div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Días</h2>
        {sum.days.map((d) => {
          const future = d.date > today;
          const w = s.weights.find((x) => x.date === d.date);
          const p = g.kcal ? Math.min((d.totals.kcal / g.kcal) * 100, 100) : 0;
          return (
            <div className="hist-day" key={d.date} onClick={() => !future && openDay(d.date)} style={{ opacity: future ? 0.4 : 1 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{DAY_NAMES[weekdayIndex(d.date)].slice(0, 3)} {formatShort(d.date).split(' ')[0]}</div>
                {w && <div className="tiny muted">{r1(w.kg)} kg</div>}
              </div>
              <div>
                {d.status === 'empty' ? (
                  <div className="tiny muted">{future ? '' : 'Sin datos'}</div>
                ) : (
                  <>
                    <div className="small num">{fmt(d.totals.kcal)} kcal · P {fmt(d.totals.protein)} · C {fmt(d.totals.carbs)} · G {fmt(d.totals.fat)}</div>
                    <div className="bar mt" style={{ marginTop: 4, height: 6 }}><span style={{ width: `${p}%`, background: 'var(--kcal)' }} /></div>
                  </>
                )}
              </div>
              {!future && <span className={`status ${d.status}`}>{STATUS_LABEL[d.status]}</span>}
            </div>
          );
        })}
        <div className="tiny muted mt">
          <b>Incompleto</b>: hay registros pero no has marcado el día como completo. <b>Consumo bajo</b>: día marcado como completo por debajo del 70 % del objetivo.
        </div>
      </div>

      <WeightCard />
    </>
  );
}

const pct = (v: number, goal: number) => (goal > 0 ? `${Math.round((v / goal) * 100)} %` : '—');

function WeightCard() {
  const s = useAppState();
  const today = todayKey();
  const last = s.weights[s.weights.length - 1];
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState<number>(s.weights.find((w) => w.date === today)?.kg ?? last?.kg ?? 0);
  return (
    <div className="card">
      <h2>Peso corporal <span className="spacer" />{last && <span className="small muted">Último: {r1(last.kg)} kg ({formatShort(last.date)})</span>}</h2>
      <div className="row">
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 170 }} />
        <div className="grow"><NumInput value={kg} onChange={setKg} placeholder="kg" /></div>
        <button className="btn primary" disabled={!(kg > 20 && kg < 400)} onClick={() => { setWeight(date, kg); toast('Peso guardado'); }}>Guardar</button>
      </div>
      {s.weights.length >= 2 && <WeightChart data={s.weights.slice(-60)} />}
      {s.weights.length > 0 && (
        <details className="mt">
          <summary>Ver registros ({s.weights.length})</summary>
          {[...s.weights].reverse().map((w) => (
            <div key={w.date} className="row small" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span className="grow">{formatShort(w.date)} {w.date.slice(0, 4)}</span>
              <b>{r1(w.kg)} kg</b>
              <button className="btn ghost small" onClick={() => setWeight(w.date, null)}>Borrar</button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function WeightChart({ data }: { data: WeightEntry[] }) {
  const W = 600, H = 160, pad = 28;
  const t0 = new Date(data[0].date).getTime();
  const t1 = new Date(data[data.length - 1].date).getTime() || t0 + 1;
  const min = Math.min(...data.map((d) => d.kg)) - 0.5;
  const max = Math.max(...data.map((d) => d.kg)) + 0.5;
  const x = (d: string) => pad + ((new Date(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - pad * 2);
  const y = (kg: number) => H - pad + 10 - ((kg - min) / (max - min)) * (H - pad * 1.5);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.date).toFixed(1)},${y(d.kg).toFixed(1)}`).join(' ');
  const diff = data[data.length - 1].kg - data[0].kg;
  return (
    <div className="mt">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolución del peso">
        <text x={4} y={y(max - 0.5) + 4} fontSize="11" fill="var(--muted)">{r1(max - 0.5)}</text>
        <text x={4} y={y(min + 0.5) + 4} fontSize="11" fill="var(--muted)">{r1(min + 0.5)}</text>
        <path d={path} fill="none" stroke="var(--protein)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d) => <circle key={d.date} cx={x(d.date)} cy={y(d.kg)} r={3} fill="var(--protein)" />)}
      </svg>
      <div className="tiny muted">{formatShort(data[0].date)} → {formatShort(data[data.length - 1].date)}: {diff >= 0 ? '+' : ''}{r1(diff)} kg</div>
    </div>
  );
}
