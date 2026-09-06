import { create } from 'zustand';

/** Screens set this while an overlay (edit numpad) needs the bottom edge. */
export const useUi = create<{ dockHidden: boolean; setDockHidden: (v: boolean) => void }>((set) => ({
  dockHidden: false,
  setDockHidden: (dockHidden) => set({ dockHidden }),
}));
