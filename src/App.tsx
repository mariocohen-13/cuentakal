import { useEffect, useState } from 'react';
import { todayKey } from './lib/date';
import { Icon, ToastHost } from './components/ui';
import { TodayView } from './views/TodayView';
import { MenuView } from './views/MenuView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

type View = 'hoy' | 'menu' | 'historial' | 'ajustes';
const TABS: { v: View; l: string; i: () => JSX.Element }[] = [
  { v: 'hoy', l: 'Hoy', i: Icon.today },
  { v: 'menu', l: 'Menú', i: Icon.menu },
  { v: 'historial', l: 'Historial', i: Icon.history },
  { v: 'ajustes', l: 'Ajustes', i: Icon.settings },
];

export default function App() {
  const [view, setView] = useState<View>('hoy');
  const [date, setDate] = useState(todayKey());

  // Si la app queda abierta y cambia el día, vuelve a "hoy" al recuperar el foco
  useEffect(() => {
    let last = todayKey();
    const check = () => {
      const now = todayKey();
      if (now !== last) {
        setDate((d) => (d === last ? now : d));
        last = now;
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  return (
    <>
      <main className="app">
        {view === 'hoy' && <TodayView date={date} setDate={setDate} goMenu={() => setView('menu')} />}
        {view === 'menu' && <MenuView />}
        {view === 'historial' && <HistoryView openDay={(d) => { setDate(d); setView('hoy'); }} />}
        {view === 'ajustes' && <SettingsView />}
      </main>
      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map(({ v, l, i: I }) => (
            <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => { setView(v); if (v === 'hoy' && view === 'hoy') setDate(todayKey()); }}>
              <I />{l}
            </button>
          ))}
        </div>
      </nav>
      <ToastHost />
    </>
  );
}
