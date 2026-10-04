/**
 * Hafash.pk — Camera, Gimbal & Drone Database
 * 
 * Equipment for Hafash Network matching.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CameraType = 'mirrorless' | 'dslr' | 'cinema' | 'drone' | 'action' | 'instant';
export type CameraCategory = 'entry' | 'mid' | 'pro' | 'flagship';
export type GimbalType = 'dslr-mirrorless' | 'mirrorless' | 'cinema' | 'phone';
export type DroneType = 'consumer' | 'pro' | 'cinema';

export interface Camera {
  id: string;
  brand: string;
  model: string;
  type: CameraType;
  category: CameraCategory;
  emoji: string;
}

export interface Gimbal {
  id: string;
  brand: string;
  model: string;
  type: GimbalType;
  payload: string;
  emoji: string;
}

export interface Drone {
  id: string;
  brand: string;
  model: string;
  type: DroneType;
  emoji: string;
}

// ═══════════════════════════════════════════════════════════════
// CAMERA DATABASE — 50+ Cameras
// ═══════════════════════════════════════════════════════════════

export const CAMERAS: Camera[] = [
  // ═══ SONY ═══
  { id: 'sony-a7-iii', brand: 'Sony', model: 'A7 III', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'sony-a7-iv', brand: 'Sony', model: 'A7 IV', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'sony-a7r-v', brand: 'Sony', model: 'A7R V', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'sony-a7s-iii', brand: 'Sony', model: 'A7S III', type: 'mirrorless', category: 'pro', emoji: '🎥' },
  { id: 'sony-a1', brand: 'Sony', model: 'A1', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'sony-a9-iii', brand: 'Sony', model: 'A9 III', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'sony-fx3', brand: 'Sony', model: 'FX3', type: 'cinema', category: 'pro', emoji: '🎬' },
  { id: 'sony-fx6', brand: 'Sony', model: 'FX6', type: 'cinema', category: 'flagship', emoji: '🎬' },
  { id: 'sony-fx30', brand: 'Sony', model: 'FX30', type: 'cinema', category: 'mid', emoji: '🎬' },
  { id: 'sony-zv-e1', brand: 'Sony', model: 'ZV-E1', type: 'mirrorless', category: 'mid', emoji: '🎥' },
  { id: 'sony-zv-e10', brand: 'Sony', model: 'ZV-E10', type: 'mirrorless', category: 'entry', emoji: '📸' },

  // ═══ NIKON ═══
  { id: 'nikon-z6-ii', brand: 'Nikon', model: 'Z6 II', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'nikon-z6-iii', brand: 'Nikon', model: 'Z6 III', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'nikon-z7-ii', brand: 'Nikon', model: 'Z7 II', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'nikon-z8', brand: 'Nikon', model: 'Z8', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'nikon-z9', brand: 'Nikon', model: 'Z9', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'nikon-zf', brand: 'Nikon', model: 'Zf', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'nikon-z50', brand: 'Nikon', model: 'Z50', type: 'mirrorless', category: 'entry', emoji: '📸' },
  { id: 'nikon-d850', brand: 'Nikon', model: 'D850', type: 'dslr', category: 'pro', emoji: '📸' },
  { id: 'nikon-d780', brand: 'Nikon', model: 'D780', type: 'dslr', category: 'mid', emoji: '📸' },
  { id: 'nikon-d5600', brand: 'Nikon', model: 'D5600', type: 'dslr', category: 'entry', emoji: '📸' },

  // ═══ CANON ═══
  { id: 'canon-eos-r5', brand: 'Canon', model: 'EOS R5', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'canon-eos-r5-ii', brand: 'Canon', model: 'EOS R5 II', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'canon-eos-r6-ii', brand: 'Canon', model: 'EOS R6 II', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'canon-eos-r3', brand: 'Canon', model: 'EOS R3', type: 'mirrorless', category: 'pro', emoji: '📸' },
  { id: 'canon-eos-r8', brand: 'Canon', model: 'EOS R8', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'canon-eos-r50', brand: 'Canon', model: 'EOS R50', type: 'mirrorless', category: 'entry', emoji: '📸' },
  { id: 'canon-eos-r100', brand: 'Canon', model: 'EOS R100', type: 'mirrorless', category: 'entry', emoji: '📸' },
  { id: 'canon-5d-iv', brand: 'Canon', model: '5D Mark IV', type: 'dslr', category: 'pro', emoji: '📸' },
  { id: 'canon-6d-ii', brand: 'Canon', model: '6D Mark II', type: 'dslr', category: 'mid', emoji: '📸' },
  { id: 'canon-90d', brand: 'Canon', model: '90D', type: 'dslr', category: 'mid', emoji: '📸' },
  { id: 'canon-c70', brand: 'Canon', model: 'C70', type: 'cinema', category: 'pro', emoji: '🎬' },
  { id: 'canon-c300-iii', brand: 'Canon', model: 'C300 III', type: 'cinema', category: 'flagship', emoji: '🎬' },
  { id: 'canon-r5-c', brand: 'Canon', model: 'EOS R5 C', type: 'cinema', category: 'pro', emoji: '🎬' },

  // ═══ FUJIFILM ═══
  { id: 'fujifilm-xt-5', brand: 'Fujifilm', model: 'X-T5', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'fujifilm-xt-4', brand: 'Fujifilm', model: 'X-T4', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'fujifilm-xt-30-ii', brand: 'Fujifilm', model: 'X-T30 II', type: 'mirrorless', category: 'entry', emoji: '📸' },
  { id: 'fujifilm-xh2s', brand: 'Fujifilm', model: 'X-H2S', type: 'mirrorless', category: 'pro', emoji: '📸' },
  { id: 'fujifilm-xh2', brand: 'Fujifilm', model: 'X-H2', type: 'mirrorless', category: 'pro', emoji: '📸' },
  { id: 'fujifilm-x100v', brand: 'Fujifilm', model: 'X100V', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'fujifilm-x100vi', brand: 'Fujifilm', model: 'X100VI', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'fujifilm-gfx-100-ii', brand: 'Fujifilm', model: 'GFX 100 II', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'fujifilm-gfx-100s', brand: 'Fujifilm', model: 'GFX 100S', type: 'mirrorless', category: 'flagship', emoji: '📸' },

  // ═══ PANASONIC ═══
  { id: 'panasonic-s5-ii', brand: 'Panasonic', model: 'Lumix S5 II', type: 'mirrorless', category: 'mid', emoji: '📸' },
  { id: 'panasonic-s5-iix', brand: 'Panasonic', model: 'Lumix S5 IIX', type: 'mirrorless', category: 'mid', emoji: '🎥' },
  { id: 'panasonic-gh6', brand: 'Panasonic', model: 'Lumix GH6', type: 'mirrorless', category: 'pro', emoji: '🎥' },
  { id: 'panasonic-gh7', brand: 'Panasonic', model: 'Lumix GH7', type: 'mirrorless', category: 'pro', emoji: '🎥' },
  { id: 'panasonic-g100', brand: 'Panasonic', model: 'Lumix G100', type: 'mirrorless', category: 'entry', emoji: '📸' },

  // ═══ LEICA ═══
  { id: 'leica-q3', brand: 'Leica', model: 'Q3', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'leica-sl3', brand: 'Leica', model: 'SL3', type: 'mirrorless', category: 'flagship', emoji: '📸' },
  { id: 'leica-m11', brand: 'Leica', model: 'M11', type: 'mirrorless', category: 'flagship', emoji: '📸' },

  // ═══ PHONE ═══
  { id: 'iphone-15-pro', brand: 'Apple', model: 'iPhone 15 Pro', type: 'instant', category: 'mid', emoji: '📱' },
  { id: 'iphone-16-pro', brand: 'Apple', model: 'iPhone 16 Pro', type: 'instant', category: 'mid', emoji: '📱' },
  { id: 'samsung-s24-ultra', brand: 'Samsung', model: 'S24 Ultra', type: 'instant', category: 'mid', emoji: '📱' },

  // ═══ OTHER ═══
  { id: 'other-camera', brand: 'Other', model: 'Other Camera', type: 'mirrorless', category: 'mid', emoji: '📷' },
];

// ═══════════════════════════════════════════════════════════════
// GIMBAL DATABASE — 15+ Gimbals
// ═══════════════════════════════════════════════════════════════

export const GIMBALS: Gimbal[] = [
  // ═══ DJI ═══
  { id: 'dji-rs3-pro', brand: 'DJI', model: 'RS 3 Pro', type: 'dslr-mirrorless', payload: '4.5 kg', emoji: '🎬' },
  { id: 'dji-rs3', brand: 'DJI', model: 'RS 3', type: 'dslr-mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'dji-rs3-mini', brand: 'DJI', model: 'RS 3 Mini', type: 'mirrorless', payload: '2 kg', emoji: '🎬' },
  { id: 'dji-rs4-pro', brand: 'DJI', model: 'RS 4 Pro', type: 'dslr-mirrorless', payload: '4.5 kg', emoji: '🎬' },
  { id: 'dji-rs4', brand: 'DJI', model: 'RS 4', type: 'dslr-mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'dji-rs4-mini', brand: 'DJI', model: 'RS 4 Mini', type: 'mirrorless', payload: '2 kg', emoji: '🎬' },
  { id: 'dji-ronin-4d', brand: 'DJI', model: 'Ronin 4D', type: 'cinema', payload: 'Full Rig', emoji: '🎬' },
  { id: 'dji-ronin-sc', brand: 'DJI', model: 'Ronin SC', type: 'mirrorless', payload: '2 kg', emoji: '🎬' },
  { id: 'dji-om-6', brand: 'DJI', model: 'OM 6', type: 'phone', payload: 'Phone', emoji: '📱' },
  { id: 'dji-om-se', brand: 'DJI', model: 'OM SE', type: 'phone', payload: 'Phone', emoji: '📱' },

  // ═══ ZHIYUN ═══
  { id: 'zhiyun-crane-3s', brand: 'Zhiyun', model: 'Crane 3S', type: 'mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'zhiyun-crane-4', brand: 'Zhiyun', model: 'Crane 4', type: 'dslr-mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'zhiyun-weebill-3s', brand: 'Zhiyun', model: 'Weebill 3S', type: 'mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'zhiyun-weebill-2', brand: 'Zhiyun', model: 'Weebill 2', type: 'mirrorless', payload: '3 kg', emoji: '🎬' },
  { id: 'zhiyun-smooth-5s', brand: 'Zhiyun', model: 'Smooth 5S', type: 'phone', payload: 'Phone', emoji: '📱' },

  // ═══ MOZA ═══
  { id: 'moza-aircross-3', brand: 'Moza', model: 'AirCross 3', type: 'mirrorless', payload: '3.2 kg', emoji: '🎬' },
  { id: 'moza-aircross-2s', brand: 'Moza', model: 'AirCross 2S', type: 'mirrorless', payload: '3.2 kg', emoji: '🎬' },
  { id: 'moza-r2', brand: 'Moza', model: 'R2', type: 'mirrorless', payload: '3 kg', emoji: '🎬' },

  // ═══ FEIYUTECH ═══
  { id: 'feiyu-scorp-c', brand: 'FeiyuTech', model: 'Scorp-C', type: 'mirrorless', payload: '1.2 kg', emoji: '🎬' },
  { id: 'feiyu-scorp', brand: 'FeiyuTech', model: 'Scorp', type: 'dslr-mirrorless', payload: '2.5 kg', emoji: '🎬' },

  // ═══ OTHER ═══
  { id: 'other-gimbal', brand: 'Other', model: 'Other Gimbal', type: 'mirrorless', payload: 'Varies', emoji: '🎬' },
];

// ═══════════════════════════════════════════════════════════════
// DRONE DATABASE — 10+ Drones
// ═══════════════════════════════════════════════════════════════

export const DRONES: Drone[] = [
  // ═══ DJI ═══
  { id: 'dji-mavic-3-pro', brand: 'DJI', model: 'Mavic 3 Pro', type: 'pro', emoji: '🚁' },
  { id: 'dji-mavic-3', brand: 'DJI', model: 'Mavic 3', type: 'pro', emoji: '🚁' },
  { id: 'dji-mavic-3-classic', brand: 'DJI', model: 'Mavic 3 Classic', type: 'pro', emoji: '🚁' },
  { id: 'dji-air-3', brand: 'DJI', model: 'Air 3', type: 'consumer', emoji: '🚁' },
  { id: 'dji-air-2s', brand: 'DJI', model: 'Air 2S', type: 'consumer', emoji: '🚁' },
  { id: 'dji-mini-4-pro', brand: 'DJI', model: 'Mini 4 Pro', type: 'consumer', emoji: '🚁' },
  { id: 'dji-mini-3', brand: 'DJI', model: 'Mini 3', type: 'consumer', emoji: '🚁' },
  { id: 'dji-inspire-3', brand: 'DJI', model: 'Inspire 3', type: 'cinema', emoji: '🚁' },
  { id: 'dji-fpv', brand: 'DJI', model: 'FPV', type: 'consumer', emoji: '🚁' },
  { id: 'dji-avata-2', brand: 'DJI', model: 'Avata 2', type: 'consumer', emoji: '🚁' },

  // ═══ AUTEL ═══
  { id: 'autel-evo-ii-pro', brand: 'Autel', model: 'EVO II Pro', type: 'pro', emoji: '🚁' },
  { id: 'autel-evo-lite', brand: 'Autel', model: 'EVO Lite+', type: 'consumer', emoji: '🚁' },

  // ═══ OTHER ═══
  { id: 'other-drone', brand: 'Other', model: 'Other Drone', type: 'consumer', emoji: '🚁' },
];

// ═══════════════════════════════════════════════════════════════
// ACTION CAMS
// ═══════════════════════════════════════════════════════════════

export const ACTION_CAMS = [
  { id: 'gopro-hero-12', brand: 'GoPro', model: 'Hero 12', emoji: '🏃' },
  { id: 'gopro-hero-11', brand: 'GoPro', model: 'Hero 11', emoji: '🏃' },
  { id: 'gopro-max', brand: 'GoPro', model: 'Max 360', emoji: '🏃' },
  { id: 'insta360-x4', brand: 'Insta360', model: 'X4', emoji: '🏃' },
  { id: 'insta360-x3', brand: 'Insta360', model: 'X3', emoji: '🏃' },
  { id: 'insta360-go-3', brand: 'Insta360', model: 'GO 3', emoji: '🏃' },
];

// ═══════════════════════════════════════════════════════════════
// CAMERA BRANDS
// ═══════════════════════════════════════════════════════════════

export const CAMERA_BRANDS = [
  { id: 'sony', label: 'Sony', emoji: '📸' },
  { id: 'nikon', label: 'Nikon', emoji: '📸' },
  { id: 'canon', label: 'Canon', emoji: '📸' },
  { id: 'fujifilm', label: 'Fujifilm', emoji: '📸' },
  { id: 'panasonic', label: 'Panasonic', emoji: '📸' },
  { id: 'leica', label: 'Leica', emoji: '📸' },
  { id: 'dji', label: 'DJI', emoji: '🚁' },
  { id: 'zhiyun', label: 'Zhiyun', emoji: '🎬' },
  { id: 'moza', label: 'Moza', emoji: '🎬' },
  { id: 'gopro', label: 'GoPro', emoji: '🏃' },
  { id: 'insta360', label: 'Insta360', emoji: '🏃' },
  { id: 'apple', label: 'Apple', emoji: '📱' },
  { id: 'samsung', label: 'Samsung', emoji: '📱' },
  { id: 'other', label: 'Other', emoji: '📷' },
];

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT TYPES
// ═══════════════════════════════════════════════════════════════

export const EQUIPMENT_TYPES = [
  { id: 'camera', label: 'Camera', emoji: '📸' },
  { id: 'gimbal', label: 'Gimbal', emoji: '🎬' },
  { id: 'drone', label: 'Drone', emoji: '🚁' },
  { id: 'action', label: 'Action Cam', emoji: '🏃' },
  { id: 'phone', label: 'Phone', emoji: '📱' },
];

// ═══════════════════════════════════════════════════════════════
// CAMERA TYPES (for grouping)
// ═══════════════════════════════════════════════════════════════

export const CAMERA_TYPES = [
  { id: 'mirrorless', label: 'Mirrorless', emoji: '📸' },
  { id: 'dslr', label: 'DSLR', emoji: '📸' },
  { id: 'cinema', label: 'Cinema', emoji: '🎬' },
  { id: 'drone', label: 'Drone', emoji: '🚁' },
  { id: 'action', label: 'Action Cam', emoji: '🏃' },
  { id: 'instant', label: 'Phone / Instant', emoji: '📱' },
];

// ═══════════════════════════════════════════════════════════════
// GIMBAL TYPES
// ═══════════════════════════════════════════════════════════════

export const GIMBAL_TYPES = [
  { id: 'dslr-mirrorless', label: 'DSLR / Mirrorless', emoji: '📸' },
  { id: 'mirrorless', label: 'Mirrorless Only', emoji: '📸' },
  { id: 'cinema', label: 'Cinema Rig', emoji: '🎬' },
  { id: 'phone', label: 'Phone', emoji: '📱' },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — CAMERAS
// ═══════════════════════════════════════════════════════════════

export function getCameraById(id: string): Camera | undefined {
  return CAMERAS.find((c) => c.id === id);
}

export function getCamerasByBrand(brand: string): Camera[] {
  return CAMERAS.filter((c) => c.brand.toLowerCase() === brand.toLowerCase());
}

export function getCamerasByType(type: CameraType): Camera[] {
  return CAMERAS.filter((c) => c.type === type);
}

export function searchCameras(query: string): Camera[] {
  const q = query.toLowerCase().trim();
  if (!q) return CAMERAS;

  return CAMERAS.filter(
    (c) =>
      c.brand.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      `${c.brand} ${c.model}`.toLowerCase().includes(q)
  );
}

export function getCameraLabel(id: string): string {
  const camera = getCameraById(id);
  return camera ? `${camera.brand} ${camera.model}` : id;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — GIMBALS
// ═══════════════════════════════════════════════════════════════

export function getGimbalById(id: string): Gimbal | undefined {
  return GIMBALS.find((g) => g.id === id);
}

export function getGimbalsByBrand(brand: string): Gimbal[] {
  return GIMBALS.filter((g) => g.brand.toLowerCase() === brand.toLowerCase());
}

export function getGimbalsByType(type: GimbalType): Gimbal[] {
  return GIMBALS.filter((g) => g.type === type);
}

export function searchGimbals(query: string): Gimbal[] {
  const q = query.toLowerCase().trim();
  if (!q) return GIMBALS;

  return GIMBALS.filter(
    (g) =>
      g.brand.toLowerCase().includes(q) ||
      g.model.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q) ||
      `${g.brand} ${g.model}`.toLowerCase().includes(q)
  );
}

export function getGimbalLabel(id: string): string {
  const gimbal = getGimbalById(id);
  return gimbal ? `${gimbal.brand} ${gimbal.model}` : id;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — DRONES
// ═══════════════════════════════════════════════════════════════

export function getDroneById(id: string): Drone | undefined {
  return DRONES.find((d) => d.id === id);
}

export function searchDrones(query: string): Drone[] {
  const q = query.toLowerCase().trim();
  if (!q) return DRONES;

  return DRONES.filter(
    (d) =>
      d.brand.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      `${d.brand} ${d.model}`.toLowerCase().includes(q)
  );
}

export function getDroneLabel(id: string): string {
  const drone = getDroneById(id);
  return drone ? `${drone.brand} ${drone.model}` : id;
}

// ═══════════════════════════════════════════════════════════════
// LABEL HELPERS
// ═══════════════════════════════════════════════════════════════

export function getCameraTypeLabel(type: string): string {
  const t = CAMERA_TYPES.find((c) => c.id === type);
  return t ? t.label : type;
}

export function getGimbalTypeLabel(type: string): string {
  const t = GIMBAL_TYPES.find((g) => g.id === type);
  return t ? t.label : type;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    entry: 'Entry Level',
    mid: 'Mid Range',
    pro: 'Professional',
    flagship: 'Flagship',
  };
  return labels[category] || category;
}

export function getEquipmentLabel(id: string): string {
  const camera = CAMERAS.find((c) => c.id === id);
  if (camera) return `${camera.brand} ${camera.model}`;

  const gimbal = GIMBALS.find((g) => g.id === id);
  if (gimbal) return `${gimbal.brand} ${gimbal.model}`;

  const drone = DRONES.find((d) => d.id === id);
  if (drone) return `${drone.brand} ${drone.model}`;

  const action = ACTION_CAMS.find((a) => a.id === id);
  if (action) return `${action.brand} ${action.model}`;

  return id;
}