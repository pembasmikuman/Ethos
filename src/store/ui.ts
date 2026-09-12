import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';

export type Appearance = 'system' | 'dark' | 'light';
export type RestSound = 'system' | 'custom';
export type Panel = 'volume' | 'days' | 'map';
const PANELS: Panel[] = ['volume', 'days', 'map'];

type Ui = {
  dockHidden: boolean;
  setDockHidden: (v: boolean) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** Muscle keys shown on the Home volume panel. */
  volumeMuscles: string[];
  toggleVolumeMuscle: (key: string) => void;
  /** Home panel carousel order. */
  panelOrder: Panel[];
  movePanel: (key: Panel, dir: -1 | 1) => void;
  onboarded: boolean;
  setOnboarded: () => void;
  /** Which sound the rest-done notification asks for. iOS only. */
  restSound: RestSound;
  setRestSound: (r: RestSound) => void;
  /** Filename of the picked sound inside Library/Sounds, and the name to show for it. */
  customSound: string | null;
  customSoundLabel: string | null;
  setCustomSound: (file: string, label: string) => void;
  /** Exercise the picker chose while reviewing a finished session. Not persisted: it is
   *  a hand-off between the picker and the review screen, read once and cleared. */
  pendingExercise: string | null;
  setPendingExercise: (id: string) => void;
  clearPendingExercise: () => void;
};

const DEFAULT_MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'delts', 'biceps', 'triceps'];

const KEY = 'appearance';
const RKEY = 'restSound';
const CKEY = 'customSound';
const PKEY = 'panelOrder';
const initialPanels = (() => { try { const p = JSON.parse(Storage.getItemSync(PKEY) ?? '') as Panel[]; return [...p.filter((k) => PANELS.includes(k)), ...PANELS.filter((k) => !p.includes(k))]; } catch { return PANELS; } })();
const initial = (Storage.getItemSync(KEY) as Appearance | null) ?? 'system';
const initialRest = Storage.getItemSync(RKEY) === 'custom' ? 'custom' : 'system';
const initialCustom = (() => { try { return JSON.parse(Storage.getItemSync(CKEY) ?? '') as { file: string; label: string }; } catch { return null; } })();
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
  panelOrder: initialPanels,
  movePanel: (key, dir) =>
    set((st) => {
      const i = st.panelOrder.indexOf(key), j = i + dir;
      if (i < 0 || j < 0 || j >= st.panelOrder.length) return {};
      const panelOrder = [...st.panelOrder];
      [panelOrder[i], panelOrder[j]] = [panelOrder[j], panelOrder[i]];
      Storage.setItemSync(PKEY, JSON.stringify(panelOrder));
      return { panelOrder };
    }),
  restSound: initialRest,
  setRestSound: (restSound) => {
    Storage.setItemSync(RKEY, restSound);
    set({ restSound });
  },
  customSound: initialCustom?.file ?? null,
  customSoundLabel: initialCustom?.label ?? null,
  setCustomSound: (file, label) => {
    Storage.setItemSync(CKEY, JSON.stringify({ file, label }));
    set({ customSound: file, customSoundLabel: label, restSound: 'custom' });
    Storage.setItemSync(RKEY, 'custom');
  },
  pendingExercise: null,
  setPendingExercise: (pendingExercise) => set({ pendingExercise }),
  clearPendingExercise: () => set({ pendingExercise: null }),
  onboarded: Storage.getItemSync('onboarded') === '1',
  setOnboarded: () => { Storage.setItemSync('onboarded', '1'); set({ onboarded: true }); },
  volumeMuscles: initialMuscles,
  toggleVolumeMuscle: (key) =>
    set((st) => {
      const volumeMuscles = st.volumeMuscles.includes(key) ? st.volumeMuscles.filter((k) => k !== key) : [...st.volumeMuscles, key];
      Storage.setItemSync(MKEY, JSON.stringify(volumeMuscles));
      return { volumeMuscles };
    }),
}));
