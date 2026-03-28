import { create } from 'zustand';
import { api } from '../api';

export interface Profile {
  id?: number;
  name: string;
  birth_date: string;
  lifespan: number;
}

export interface Chapter {
  id: number;
  name: string;
  color: string;
  start_date: string;
  end_date: string | null;
  sort_order: number;
}

export interface JournalEntry {
  id: number;
  year: number;
  week: number;
  note: string;
  rating: number; // 1 to 5
}

export interface Milestone {
  id: number;
  title: string;
  date: string;
  icon: string;
  description: string | null;
}

export interface Goal {
  id: number;
  title: string;
  target_date: string;
  completed: number; // 0 or 1
  description: string | null;
}

export interface Snapshot {
  id: number;
  year: number;
  week: number;
  filename: string;
  original_name: string | null;
}

export interface AppSettings {
  theme: string;
  mode: string;
  view: string;
  reminder_enabled: string;
}

interface AppState {
  profile: Profile | null;
  chapters: Chapter[];
  journal: JournalEntry[];
  milestones: Milestone[];
  goals: Goal[];
  snapshots: Snapshot[];
  settings: AppSettings;
  currentView: string;
  heatmapMode: boolean;
  selectedWeek: { year: number; week: number } | null;
  sidebarOpen: boolean;
  
  // Actions
  fetchInitialData: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  setCurrentView: (view: string) => void;
  setHeatmapMode: (active: boolean) => void;
  setSelectedWeek: (weekInfo: { year: number; week: number } | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  chapters: [],
  journal: [],
  milestones: [],
  goals: [],
  snapshots: [],
  settings: { theme: 'frosted', mode: 'dark', view: 'weeks', reminder_enabled: 'true' },
  currentView: 'weeks',
  heatmapMode: false,
  selectedWeek: null,
  sidebarOpen: false,

  fetchInitialData: async () => {
    try {
      const data = await api.get<{
        profile: Profile;
        chapters: Chapter[];
        journal: JournalEntry[];
        milestones: Milestone[];
        goals: Goal[];
        snapshots: Snapshot[];
        settings: Partial<AppSettings>;
      }>('/api/grid-data');

      set({
        profile: data.profile || null,
        chapters: data.chapters || [],
        journal: data.journal || [],
        milestones: data.milestones || [],
        goals: data.goals || [],
        snapshots: data.snapshots || [],
        settings: { ...get().settings, ...(data.settings || {}) }
      });
    } catch (err: any) {
      if (err.message !== 'Not authenticated') {
        console.error('Failed to init app state:', err);
      }
    }
  },

  updateSettings: async (newSettings: Partial<AppSettings>) => {
    const current = get().settings;
    const merged = { ...current, ...newSettings };
    set({ settings: merged });
    
    // Auto-apply theme styles
    if (newSettings.mode) document.documentElement.setAttribute('data-theme', newSettings.mode);
    if (newSettings.theme) document.documentElement.setAttribute('data-palette', newSettings.theme);
    
    await api.put('/api/settings', newSettings);
  },

  updateProfile: async (profile: Profile) => {
    set({ profile });
  },

  setCurrentView: (view: string) => set({ currentView: view }),
  setHeatmapMode: (active: boolean) => set({ heatmapMode: active }),
  setSelectedWeek: (weekInfo) => set({ selectedWeek: weekInfo, sidebarOpen: !!weekInfo }),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open })
}));
