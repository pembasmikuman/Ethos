import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';

export type Appearance = 'system' | 'dark' | 'light';

type Ui = {
  dockHidden: boolean;
  setDockHidden: (v: boolean) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
};

const KEY = 'appearance';
const initial = (Storage.getItemSync(KEY) as Appearance | null) ?? 'system';

/** Screens set dockHidden while an overlay (edit numpad) needs the bottom edge. */
export const useUi = create<Ui>((set) => ({
  dockHidden: false,
  setDockHidden: (dockHidden) => set({ dockHidden }),
  appearance: initial,
  setAppearance: (appearance) => {
    Storage.setItemSync(KEY, appearance);
    set({ appearance });
  },
}));
