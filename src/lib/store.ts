import { useSyncExternalStore } from 'react';
import type { AppState } from './types';
import { normalizeState } from './backup';

export const STORAGE_KEY = 'cuentakal:v1';

export function defaultState(): AppState {
  return {
    version: 1,
    goals: { kcal: 2200, protein: 140, carbs: 250, fat: 70 },
    foods: [],
    favorites: [],
    entries: [],
    menus: {},
    dishLibrary: {},
    savedMeals: [],
    weights: [],
    closedDays: [],
  };
}

export function loadState(storage: Storage | undefined = globalThis.localStorage): AppState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    console.error('No se pudieron leer los datos guardados', err);
    // Conservamos el contenido dañado para no perderlo.
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) storage?.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
    } catch { /* nada */ }
    return defaultState();
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveState(state: AppState, storage: Storage | undefined = globalThis.localStorage): SaveResult {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

type Listener = () => void;
let state: AppState = typeof localStorage !== 'undefined' ? loadState() : defaultState();
let lastError: string | null = null;
const listeners = new Set<Listener>();

export function getState(): AppState {
  return state;
}

export function getSaveError(): string | null {
  return lastError;
}

export function setState(updater: (s: AppState) => AppState): void {
  state = updater(state);
  const res = saveState(state);
  lastError = res.ok ? null : res.error;
  listeners.forEach((l) => l());
}

export function replaceState(next: AppState): void {
  setState(() => next);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Sincroniza si la app está abierta en varias pestañas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = loadState();
      listeners.forEach((l) => l());
    }
  });
}
