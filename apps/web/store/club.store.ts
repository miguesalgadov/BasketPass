import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Club {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  plan: string;
}

interface ClubState {
  club: Club | null;
  setClub: (club: Club) => void;
  clearClub: () => void;
}

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      club: null,
      setClub: (club) => set({ club }),
      clearClub: () => set({ club: null }),
    }),
    { name: 'basketpass-club' }
  )
);
