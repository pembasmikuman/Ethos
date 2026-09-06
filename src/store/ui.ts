import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';

export type Appearance = 'system' | 'dark' | 'light';

type Ui = {
  dockHidden: boolean;
  setDockHidden: (v: boolean) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** Muscle keys shown on the Home volume panel. */
  volumeMuscles: string[];
  toggleVolumeMuscle: (key: string) => void;
};

const DEFAULT_MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'delts', 'biceps', 'triceps'];

const KEY = 'appearance';
const initial = (Storage.getItemSync(KEY) as Appearance | null) ?? 'system';
const MKEY = 'volumeMuscles';
const initialMuscles = (() => { try { return JSON.parse(Storage.getItemSync(MKEY) ?? '') as string[]; } catch { return DEFAULT_MUSCLES; } })();

/** Screens set dockHidden while an overlay (edit numpad) needs the bottom edge. */
export const useUi = create<Ui>((set) => ({
  dockHidden: false,
  setDockHidden: (dockHidden) => set({ dockHidden }),
  appearance: initial,
  setAppearance: (appearance) => {
    Storage.setItemSync(KEY, appearance);
    set({ appearance });
  },
  volumeMuscles: initialMuscles,
  toggleVolumeMuscle: (key) =>
    set((st) => {
      const volumeMuscles = st.volumeMuscles.includes(key) ? st.volumeMuscles.filter((k) => k !== key) : [...st.volumeMuscles, key];
      Storage.setItemSync(MKEY, JSON.stringify(volumeMuscles));
      return { volumeMuscles };
    }),
}));
