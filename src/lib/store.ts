
"use client";

import { create } from 'zustand';

export type EventCategory = 'Wedding' | 'Mehndi' | 'Barat' | 'Engagement' | 'Other';

export interface GalleryItem {
  id: string;
  url: string;
  masterUrl?: string;
  type: 'image' | 'video';
  isFavorite: boolean;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: string;
}

export interface EventGallery {
  id: string;
  slug?: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  category: EventCategory;
  coverImage: string;
  items: GalleryItem[];
  isLocked: boolean;
  isPublic: boolean;
  isPaid: boolean;
  albumStatus?: string;
  viewCount: number;
  photographerNote?: string;
  welcomeTitle?: string;
  studioName?: string;
  whatsappNumber?: string;
  createdAt?: string;
}

interface HafashStore {
  events: EventGallery[];
  addEvent: (event: EventGallery) => void;
  updateEvent: (id: string, updates: Partial<EventGallery>) => void;
  deleteEvent: (id: string) => void;
  toggleFavorite: (eventId: string, itemId: string) => void;
  addItems: (eventId: string, newItems: GalleryItem[]) => void;
}

const initialEvents: EventGallery[] = [
  {
    id: 'test-1',
    title: 'The Royal Wedding (Sample)',
    clientName: 'Ahmed & Fatima',
    date: '2024-05-15',
    category: 'Wedding',
    coverImage: 'https://picsum.photos/seed/hafash-hero/800/600',
    items: [
      { id: 'i1', url: 'https://picsum.photos/seed/1/1200/1600', type: 'image', isFavorite: false, fileName: 'shot-01.jpg' },
      { id: 'i2', url: 'https://picsum.photos/seed/2/1200/1600', type: 'image', isFavorite: true, fileName: 'shot-02.jpg' },
      { id: 'i3', url: 'https://picsum.photos/seed/3/1200/1600', type: 'image', isFavorite: false, fileName: 'shot-03.jpg' },
    ],
    isLocked: true,
    isPublic: true,
    isPaid: false,
    albumStatus: "New Selection",
    viewCount: 128,
    photographerNote: "Welcome to the Hafash experience. This is a test note to show how you can communicate with your clients.",
    studioName: "Test Studio",
    createdAt: new Date().toISOString()
  }
];

export const useStore = create<HafashStore>((set) => ({
  events: initialEvents,
  addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  toggleFavorite: (eventId, itemId) => set((state) => ({
    events: state.events.map(e => e.id === eventId ? {
      ...e,
      items: (e.items || []).map(i => i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i)
    } : e)
  })),
  addItems: (eventId, newItems) => set((state) => ({
    events: state.events.map(e => e.id === eventId ? {
      ...e,
      items: [...(e.items || []), ...newItems]
    } : e)
  })),
}));
