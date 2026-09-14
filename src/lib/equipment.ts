/**
 * Hafash Network — Equipment Catalog
 * Predefined list used for the hybrid dropdown (search + select) with a
 * "custom" fallback for gear not listed here. Keeping this as a flat,
 * categorized array makes search/filter straightforward.
 */

export type EquipmentCategory =
  | 'camera'
  | 'lens'
  | 'gimbal'
  | 'drone'
  | 'lighting'
  | 'audio'
  | 'accessory';

export interface EquipmentItem {
  id: string;
  category: EquipmentCategory;
  name: string;
}

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  // Camera Bodies
  { id: 'cam-canon-r5', category: 'camera', name: 'Canon EOS R5' },
  { id: 'cam-canon-r6ii', category: 'camera', name: 'Canon EOS R6 Mark II' },
  { id: 'cam-canon-5d4', category: 'camera', name: 'Canon EOS 5D Mark IV' },
  { id: 'cam-canon-90d', category: 'camera', name: 'Canon EOS 90D' },
  { id: 'cam-nikon-z9', category: 'camera', name: 'Nikon Z9' },
  { id: 'cam-nikon-z8', category: 'camera', name: 'Nikon Z8' },
  { id: 'cam-nikon-z6ii', category: 'camera', name: 'Nikon Z6 II' },
  { id: 'cam-nikon-z7ii', category: 'camera', name: 'Nikon Z7 II' },
  { id: 'cam-nikon-d850', category: 'camera', name: 'Nikon D850' },
  { id: 'cam-sony-a7iv', category: 'camera', name: 'Sony A7 IV' },
  { id: 'cam-sony-a7riv', category: 'camera', name: 'Sony A7R IV' },
  { id: 'cam-sony-a7siii', category: 'camera', name: 'Sony A7S III' },
  { id: 'cam-sony-a9ii', category: 'camera', name: 'Sony A9 II' },
  { id: 'cam-fuji-xt5', category: 'camera', name: 'Fujifilm X-T5' },
  { id: 'cam-fuji-xh2', category: 'camera', name: 'Fujifilm X-H2' },
  { id: 'cam-panasonic-s5ii', category: 'camera', name: 'Panasonic Lumix S5 II' },

  // Lenses
  { id: 'lens-24-70', category: 'lens', name: '24-70mm f/2.8' },
  { id: 'lens-70-200', category: 'lens', name: '70-200mm f/2.8' },
  { id: 'lens-16-35', category: 'lens', name: '16-35mm f/2.8' },
  { id: 'lens-50-1.4', category: 'lens', name: '50mm f/1.4' },
  { id: 'lens-85-1.4', category: 'lens', name: '85mm f/1.4' },
  { id: 'lens-35-1.4', category: 'lens', name: '35mm f/1.4' },
  { id: 'lens-100-macro', category: 'lens', name: '100mm Macro' },
  { id: 'lens-14-24', category: 'lens', name: '14-24mm f/2.8' },

  // Gimbals / Stabilizers
  { id: 'gimbal-dji-rs3', category: 'gimbal', name: 'DJI RS 3' },
  { id: 'gimbal-dji-rs3-pro', category: 'gimbal', name: 'DJI RS 3 Pro' },
  { id: 'gimbal-dji-rsc2', category: 'gimbal', name: 'DJI RSC 2' },
  { id: 'gimbal-zhiyun-crane3s', category: 'gimbal', name: 'Zhiyun Crane 3S' },
  { id: 'gimbal-zhiyun-weebill3', category: 'gimbal', name: 'Zhiyun Weebill 3' },
  { id: 'gimbal-dji-om6', category: 'gimbal', name: 'DJI Osmo Mobile 6' },

  // Drones
  { id: 'drone-dji-mavic3', category: 'drone', name: 'DJI Mavic 3' },
  { id: 'drone-dji-mavic3-pro', category: 'drone', name: 'DJI Mavic 3 Pro' },
  { id: 'drone-dji-air3', category: 'drone', name: 'DJI Air 3' },
  { id: 'drone-dji-mini4pro', category: 'drone', name: 'DJI Mini 4 Pro' },
  { id: 'drone-dji-inspire3', category: 'drone', name: 'DJI Inspire 3' },

  // Lighting
  { id: 'light-godox-ad200', category: 'lighting', name: 'Godox AD200' },
  { id: 'light-godox-ad600', category: 'lighting', name: 'Godox AD600' },
  { id: 'light-speedlight', category: 'lighting', name: 'Speedlight / Flash' },
  { id: 'light-led-panel', category: 'lighting', name: 'LED Continuous Light Panel' },
  { id: 'light-softbox', category: 'lighting', name: 'Softbox' },
  { id: 'light-reflector', category: 'lighting', name: 'Reflector' },

  // Audio
  { id: 'audio-shotgun-mic', category: 'audio', name: 'Shotgun Microphone' },
  { id: 'audio-lav-mic', category: 'audio', name: 'Lavalier Microphone' },
  { id: 'audio-recorder', category: 'audio', name: 'Audio Recorder' },
  { id: 'audio-wireless-mic', category: 'audio', name: 'Wireless Mic System' },

  // Accessories
  { id: 'acc-tripod', category: 'accessory', name: 'Tripod' },
  { id: 'acc-monopod', category: 'accessory', name: 'Monopod' },
  { id: 'acc-monitor', category: 'accessory', name: 'External Monitor' },
];

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  camera: 'Camera Bodies',
  lens: 'Lenses',
  gimbal: 'Gimbals / Stabilizers',
  drone: 'Drones',
  lighting: 'Lighting',
  audio: 'Audio',
  accessory: 'Accessories',
};

/** Simple case-insensitive search across the catalog. */
export function searchEquipment(query: string): EquipmentItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return EQUIPMENT_CATALOG;
  return EQUIPMENT_CATALOG.filter((item) =>
    item.name.toLowerCase().includes(q)
  );
}