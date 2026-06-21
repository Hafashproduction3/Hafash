
"use client";

import { create } from 'react';

export type EventCategory = 'Wedding' | 'Mehndi' | 'Barat' | 'Engagement' | 'Other';

export interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  isFavorite: boolean;
}

export interface EventGallery {
  id: string;
  title: string;
  clientName: string;
  date: string;
  category: EventCategory;
  coverImage: string;
  items: GalleryItem[];
  isLocked: boolean;
  viewCount: number;
}

interface HafashStore {
  userRole: 'photographer' | 'client' | null;
  events: EventGallery[];
  addEvent: (event: EventGallery) => void;
  updateEvent: (id: string, updates: Partial<EventGallery>) => void;
  deleteEvent: (id: string) => void;
  toggleLock: (id: string) => void;
  toggleFavorite: (eventId: string, itemId: string) => void;
  setUserRole: (role: 'photographer' | 'client' | null) => void;
}

const initialEvents: EventGallery[] = [
  {
    id: '1',
    title: 'The Royal Wedding',
    clientName: 'Ahmed & Fatima',
    date: '2024-05-15',
    category: 'Wedding',
    coverImage: 'https://picsum.photos/seed/hafash-hero/800/600',
    items: [
      { id: 'i1', url: 'https://picsum.photos/seed/1/800/600', type: 'image', isFavorite: false },
      { id: 'i2', url: 'https://picsum.photos/seed/2/800/600', type: 'image', isFavorite: true },
      { id: 'i3', url: 'https://picsum.photos/seed/3/800/600', type: 'image', isFavorite: false },
    ],
    isLocked: true,
    viewCount: 128,
  }
];

export const useStore = create<HafashStore>((set) => ({
  userRole: 'photographer',
  events: initialEvents,
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  toggleLock: (id) => set((state) => ({
    events: state.events.map(e => e.id === id ? { ...e, isLocked: !e.isLocked } : e)
  })),
  toggleFavorite: (eventId, itemId) => set((state) => ({
    events: state.events.map(e => e.id === eventId ? {
      ...e,
      items: e.items.map(i => i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i)
    } : e)
  })),
  setUserRole: (role) => set({ userRole: role }),
}));
