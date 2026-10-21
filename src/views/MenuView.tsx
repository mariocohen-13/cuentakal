import { useRef, useState } from 'react';
import type { DayMenu, MenuDish, MenuSlot, WeekMenu } from '../lib/types';
import { MENU_SLOTS } from '../lib/types';
import { useAppState } from '../lib/store';
import { deleteWeekMenu, rememberDish, saveWeekMenu } from '../lib/actions';
import { addDays, DAY_NAMES, DAY_SHORT, formatShort, fromKey, todayKey, weekStart, weekdayIndex } from '../lib/date';
import { buildWeekMenu, emptyDays, makeDish, menuToText, parseMenuText } from '../lib/menuParser';
import { extractPdfText } from '../lib/pdf';
import { shrinkImage } from '../lib/image';
import { fmt } from '../lib/macros';
import { normalizeName } from '../lib/estimate';
import { uid } from '../lib/id';
import { AccuracyBadge, Icon, Sheet, toast } from '../components/ui';
import { DishSheet } from '../components/DishSheet';
import { addDish } from '../components/MenuDayCard';

const EXAMPLE = `LUNES
Comida: Lentejas estofadas / Pollo asado con patatas / Fruta
Cena: Crema de calabacín / Tortilla de patata / Yogur
MARTES
Comida: Macarrones con tomate / Merluza a la romana / Natillas
Cena: Ensalada mixta / Hamburguesa con pimientos / Fruta`;

export function MenuView() {
  const s = useAppState();
  const today = todayKey();
  const [ws, setWs] = useState(weekStart(today));
  const [dayIdx, setDayIdx] = useState(weekdayIndex(today));
  const [importing, setImporting] = useState(false);
  const [editDish, setEditDish] = useState<{ slot: MenuSlot; dish: MenuDish } | null>(null);
  const [showImg, setShowImg] = useState(false);
  const menu = s.menus[ws];
  const prevWs = addDays(ws, -7);
  const lastMenuKey = Object.keys(s.menus).filter((k) => k < ws).sort().pop();

  const updateDay = (fn: (d: DayMenu) => DayMenu) => {
    if (!menu) return;
    const days = menu.days.map((d, i) => (i === dayIdx ? fn(d) : d));
    saveWeekMenu({ ...menu, days });
  };

  const copyFrom = (key: string) => {
    const src = s.menus[key];
    // Usa tus correcciones guardadas si existen; si no, conserva los valores del menú copiado
    const copy = (x: MenuDish): MenuDish => (s.dishLibrary[normalizeName(x.name)] ? makeDish(x.name, s.dishLibrary) : { ...x, id: uid() });
    const days = src.days.map((d) => ({ desayuno: d.desayuno.map(copy), comida: d.comida.map(copy), cena: d.cena.map(copy) }));
    saveWeekMenu({ weekStart: ws, days, rawText: src.rawText, image: src.image, updatedAt: Date.now() });
    toast('Menú copiado');
  };

  const day = menu?.days[dayIdx];
  const date = addDays(ws, dayIdx);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="sub">Semana del {formatShort(ws)} al {formatShort(addDays(ws, 6))}</div>
          <h1>Menú</h1>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => setWs(addDays(ws, -7))} aria-label="Semana anterior"><Icon.left /></button>
          {ws !== weekStart(today) && <button className="btn small" onClick={() => { setWs(weekStart(today)); setDayIdx(weekdayIndex(today)); }}>Actual</button>}
          <button className="icon-btn" onClick={() => setWs(addDays(ws, 7))} aria-label="Semana siguiente"><Icon.right /></button>
        </div>
      </div>

      {!menu ? (
        <div className="card">
          <h2>Sin menú esta semana</h2>
          <div className="small muted mb">Pega el menú semanal como texto, o sube un PDF/imagen.</div>
          <div className="row wrap">
            <button className="btn primary" onClick={() => setImporting(true)}>Añadir menú</button>
            {lastMenuKey && <button className="btn" onClick={() => copyFrom(lastMenuKey)}>Copiar el de la semana del {formatShort(lastMenuKey)}</button>}
            <button className="btn" onClick={() => { saveWeekMenu({ weekStart: ws, days: emptyDays(), updatedAt: Date.now() }); }}>Crear vacío</button>
          </div>
          {s.menus[prevWs] && <div className="tiny muted mt">¿El colegio repite menú? Copia el anterior y ajusta los cambios.</div>}
        </div>
      ) : (
        <>
          <div className="week-days">
            {DAY_SHORT.map((d, i) => {
              const k = addDays(ws, i);
              const n = menu.days[i].desayuno.length + menu.days[i].comida.length + menu.days[i].cena.length;
              return (
                <button key={i} className={`week-day ${i === dayIdx ? 'active' : ''} ${k === today ? 'today' : ''}`} onClick={() => setDayIdx(i)}>
                  <span>{d}</span><b>{fromKey(k).getDate()}</b><span className="tiny" style={{ opacity: n ? 1 : 0.4 }}>{n ? '●' : '○'}</span>
                </button>
              );
            })}
          </div>
          <div className="card">
            <h2>{DAY_NAMES[dayIdx]} {fromKey(date).getDate()}</h2>
            {MENU_SLOTS.map((sl) => (
              <div key={sl.key} className="mb">
                <div className="slot-title">{sl.label}</div>
                {day![sl.key].length === 0 && <div className="tiny muted">—</div>}
                {day![sl.key].map((dish) => (
                  <div className="dish" key={dish.id}>
                    <div className="grow" onClick={() => setEditDish({ slot: sl.key, dish })}>
                      <div className="name">{dish.name}</div>
                      <div className="meta">≈ {fmt(dish.macros.kcal)} kcal · P {fmt(dish.macros.protein)} · C {fmt(dish.macros.carbs)} · G {fmt(dish.macros.fat)} <AccuracyBadge a={dish.accuracy} /></div>
                    </div>
                    <div className="portion-btns">
                      <button className="btn" title="Registrar ración entera" onClick={() => { addDish(date, sl.key, dish, 1); toast(`Registrado (${formatShort(date)})`); }}>1</button>
                      <button className="btn" title="Registrar media ración" onClick={() => { addDish(date, sl.key, dish, 0.5); toast(`Registrado ½ (${formatShort(date)})`); }}>½</button>
                    </div>
                  </div>
                ))}
                <button className="btn ghost small" onClick={() => {
                  const name = prompt(`Nuevo plato para ${sl.label.toLowerCase()}:`);
                  if (name?.trim()) updateDay((d) => ({ ...d, [sl.key]: [...d[sl.key], makeDish(name.trim(), s.dishLibrary)] }));
                }}>+ Añadir plato</button>
              </div>
            ))}
            <div className="tiny muted">Toca un plato para corregir su nombre o sus valores. Las correcciones se recuerdan para próximas semanas.</div>
          </div>
          <div className="row wrap mb">
            <button className="btn" onClick={() => setImporting(true)}>Reemplazar / editar como texto</button>
            {menu.image && <button className="btn" onClick={() => setShowImg(true)}>Ver imagen original</button>}
            <div className="grow" />
            <button className="btn danger" onClick={() => { if (confirm('¿Borrar el menú de esta semana? (no borra lo que ya hayas registrado)')) deleteWeekMenu(ws); }}>Borrar menú</button>
          </div>
        </>
      )}

      <div className="notice info">
        Los valores de los platos del colegio son <b>estimaciones por tipo de plato</b> (ración típica de comedor), salvo que tú los corrijas. Aparecen marcados como <span className="badge estimate">Estimación</span>.
      </div>

      {importing && <ImportSheet ws={ws} existing={menu} onClose={() => setImporting(false)} />}
      {editDish && menu && (
        <DishSheet
          dish={editDish.dish}
          onClose={() => setEditDish(null)}
          onDelete={() => { updateDay((d) => ({ ...d, [editDish.slot]: d[editDish.slot].filter((x) => x.id !== editDish.dish.id) })); setEditDish(null); }}
          onSave={(nd, remember) => {
            updateDay((d) => ({ ...d, [editDish.slot]: d[editDish.slot].map((x) => (x.id === nd.id ? nd : x)) }));
            if (remember) rememberDish(nd);
            setEditDish(null);
            toast('Plato actualizado');
          }}
        />
      )}
      {showImg && menu?.image && (
        <Sheet title="Imagen del menú" onClose={() => setShowImg(false)}><img className="menu-img" src={menu.image} alt="Menú original" /></Sheet>
      )}
    </>
  );
}

function ImportSheet({ ws, existing, onClose }: { ws: string; existing?: WeekMenu; onClose: () => void }) {
  const s = useAppState();
  const [text, setText] = useState(existing ? existing.rawText || menuToText(existing) : '');
  const [image, setImage] = useState<string | undefined>(existing?.image);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = text.trim() ? parseMenuText(text) : null;
  const count = preview ? preview.days.reduce((a, d) => a + d.desayuno.length + d.comida.length + d.cena.length, 0) : 0;

  const onFile = async (f: File) => {
    setErr(null);
    try {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        setBusy('Leyendo PDF…');
        const t = await extractPdfText(f);
        if (!t.trim()) setErr('El PDF no contiene texto seleccionable (parece escaneado). Transcríbelo o pega el texto.');
        else setText(t);
      } else if (f.type.startsWith('image/')) {
        setBusy('Procesando imagen…');
        setImage(await shrinkImage(f));
      } else setErr('Formato no admitido. Usa PDF, JPG o PNG.');
    } catch (e) {
      setErr(`No se pudo leer el archivo: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    if (!preview) return;
    saveWeekMenu(buildWeekMenu(preview.days, ws, s.dishLibrary, text, image));
    toast(`Menú guardado: ${count} platos`);
    onClose();
  };

  return (
    <Sheet title={`Menú semana del ${formatShort(ws)}`} onClose={onClose}>
      <div className="card">
        <div className="small muted mb">
          Pega el menú con los días (Lunes, Martes…) y, si los hay, «Comida:» y «Cena:». Separa los platos con <b>/</b>, punto y coma o uno por línea.
        </div>
        <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} />
        <div className="row wrap mt">
          <button className="btn small" onClick={() => fileRef.current?.click()}>Subir PDF o imagen</button>
          {!text && <button className="btn small" onClick={() => setText(EXAMPLE)}>Ver ejemplo</button>}
          <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          {busy && <span className="small muted">{busy}</span>}
        </div>
        {err && <div className="notice error mt">{err}</div>}
        <div className="tiny muted mt">PDF: se extrae el texto en tu ordenador; revísalo antes de guardar. Imagen: se guarda como referencia para que la transcribas aquí (el reconocimiento de texto de imágenes no está incluido para mantener la app 100 % local).</div>
      </div>
      {image && (
        <div className="card">
          <h2>Imagen de referencia <span className="spacer" /><button className="btn ghost small" onClick={() => setImage(undefined)}>Quitar</button></h2>
          <img className="menu-img" src={image} alt="Menú" />
        </div>
      )}
      {preview && (
        <div className="card">
          <h2>Vista previa · {count} platos</h2>
          {preview.warnings.map((w) => <div key={w} className="notice mb">{w}</div>)}
          {preview.days.map((d, i) => {
            const slots = MENU_SLOTS.filter((sl) => d[sl.key].length);
            if (!slots.length) return null;
            return (
              <div key={i} className="mb">
                <b>{DAY_NAMES[i]}</b>
                {slots.map((sl) => <div key={sl.key} className="small"><span className="muted">{sl.label}:</span> {d[sl.key].join(' · ')}</div>)}
              </div>
            );
          })}
        </div>
      )}
      <button className="btn primary block" disabled={!count} onClick={save}>{existing ? 'Reemplazar menú' : 'Guardar menú'}</button>
      {existing && <div className="tiny muted mt">Al reemplazar se vuelven a calcular los platos; los que hayas corregido antes conservan tus valores.</div>}
    </Sheet>
  );
}
