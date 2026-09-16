/**
 * Hafash Network — Equipment & Role Catalog
 */

// ─────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────

export type Role =
  | 'photographer'
  | 'videographer'
  | 'drone_operator'
  | 'album_designer'
  | 'video_editor'
  | 'photo_editor'
  | 'camera_operator'
  | 'helper'
  | 'makeup_artist';

export type RoleCategory = 'on_site' | 'remote';

export interface RoleDefinition {
  id: Role;
  label: string;
  description: string;
  category: RoleCategory;
  requiresEquipment: boolean;
  requiresPortfolio: boolean;
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  photographer: {
    id: 'photographer',
    label: 'Photographer',
    description: 'Captures still images at events and shoots.',
    category: 'on_site',
    requiresEquipment: true,
    requiresPortfolio: true,
  },
  videographer: {
    id: 'videographer',
    label: 'Videographer',
    description: 'Shoots cinematic video coverage at events.',
    category: 'on_site',
    requiresEquipment: true,
    requiresPortfolio: true,
  },
  drone_operator: {
    id: 'drone_operator',
    label: 'Drone Operator',
    description: 'Aerial cinematography using drones.',
    category: 'on_site',
    requiresEquipment: true,
    requiresPortfolio: true,
  },
  album_designer: {
    id: 'album_designer',
    label: 'Album Designer',
    description: 'Designs printed photo albums from event images.',
    category: 'remote',
    requiresEquipment: false,
    requiresPortfolio: true,
  },
  video_editor: {
    id: 'video_editor',
    label: 'Video Editor',
    description: 'Edits and color-grades event footage.',
    category: 'remote',
    requiresEquipment: false,
    requiresPortfolio: true,
  },
  photo_editor: {
    id: 'photo_editor',
    label: 'Photo Editor',
    description: 'Retouches and color-grades event photographs.',
    category: 'remote',
    requiresEquipment: false,
    requiresPortfolio: true,
  },
  camera_operator: {
    id: 'camera_operator',
    label: 'Camera Operator',
    description: 'Operates second camera or B-cam on shoots.',
    category: 'on_site',
    requiresEquipment: true,
    requiresPortfolio: true,
  },
  helper: {
    id: 'helper',
    label: 'Helper / Assistant',
    description: 'Assists photographers and videographers on-site.',
    category: 'on_site',
    requiresEquipment: false,
    requiresPortfolio: false,
  },
  makeup_artist: {
    id: 'makeup_artist',
    label: 'Makeup Artist',
    description: 'Provides professional makeup for shoots and events.',
    category: 'on_site',
    requiresEquipment: false,
    requiresPortfolio: true,
  },
};

export function hasOnSiteRole(roles: Role[] | string[]): boolean {
  return roles.some((r) => ROLE_DEFINITIONS[r as Role]?.category === 'on_site');
}

export function hasRemoteRole(roles: Role[] | string[]): boolean {
  return roles.some((r) => ROLE_DEFINITIONS[r as Role]?.category === 'remote');
}

// ─────────────────────────────────────────────────────────────
// GENDER
// ─────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female';

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
};

// ─────────────────────────────────────────────────────────────
// TURNAROUND TIME
// ─────────────────────────────────────────────────────────────

export interface TurnaroundOption {
  id: string;
  label: string;
  short: string;
  minDays: number;
  maxDays: number;
}

export const TURNAROUND_OPTIONS: TurnaroundOption[] = [
  { id: 'same_day',   label: 'Same Day',           short: 'Same day',   minDays: 0,  maxDays: 0 },
  { id: '24h',        label: 'Within 24 hours',    short: '24 hours',   minDays: 1,  maxDays: 1 },
  { id: '2_days',     label: 'Within 2 days',      short: '1-2 days',   minDays: 1,  maxDays: 2 },
  { id: '3_5_days',   label: '3 to 5 days',        short: '3-5 days',   minDays: 3,  maxDays: 5 },
  { id: '1_week',     label: 'Within 1 week',      short: '~1 week',    minDays: 5,  maxDays: 7 },
  { id: '2_weeks',    label: 'Within 2 weeks',     short: '~2 weeks',   minDays: 7,  maxDays: 14 },
  { id: '3_4_weeks',  label: '3 to 4 weeks',       short: '3-4 weeks',  minDays: 21, maxDays: 28 },
  { id: 'custom',     label: 'Depends on project', short: 'Custom',     minDays: 0,  maxDays: 0 },
];

// ─────────────────────────────────────────────────────────────
// REMOTE SERVICES
// ─────────────────────────────────────────────────────────────

export const REMOTE_SERVICES: Record<string, string[]> = {
  video_editor: [
    'Reels / Short Videos',
    'Wedding Highlight',
    'Full Wedding Film',
    'YouTube Video',
    'Commercial / Ad',
    'Music Video',
    'Documentary',
    'Corporate Video',
  ],
  photo_editor: [
    'Basic Retouch',
    'Color Grading',
    'Full Gallery Edit',
    'Advanced Retouch',
    'Background Removal',
    'Product Photos',
    'Skin Retouching',
  ],
  album_designer: [
    'Basic Album Design',
    'Premium Album Design',
    'Photo Book',
    'Digital Album',
    'Magazine Style',
    'Layflat Album',
  ],
};

// ─────────────────────────────────────────────────────────────
// EQUIPMENT CATEGORIES
// ─────────────────────────────────────────────────────────────

export type EquipmentCategory =
  | 'camera_body'
  | 'lens'
  | 'gimbal'
  | 'drone'
  | 'lighting'
  | 'audio'
  | 'accessory';

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  camera_body: 'Camera Bodies',
  lens: 'Lenses',
  gimbal: 'Gimbals & Stabilizers',
  drone: 'Drones',
  lighting: 'Lighting',
  audio: 'Audio',
  accessory: 'Accessories',
};

export interface EquipmentItem {
  id: string;
  category: EquipmentCategory;
  name: string;
  brand?: string;
}

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  // Camera Bodies
  { id: 'cam_sony_a7iv', category: 'camera_body', name: 'Sony A7 IV', brand: 'Sony' },
  { id: 'cam_sony_a7iii', category: 'camera_body', name: 'Sony A7 III', brand: 'Sony' },
  { id: 'cam_sony_a7rv', category: 'camera_body', name: 'Sony A7R V', brand: 'Sony' },
  { id: 'cam_sony_a7siii', category: 'camera_body', name: 'Sony A7S III', brand: 'Sony' },
  { id: 'cam_sony_a1', category: 'camera_body', name: 'Sony A1', brand: 'Sony' },
  { id: 'cam_sony_fx3', category: 'camera_body', name: 'Sony FX3', brand: 'Sony' },
  { id: 'cam_sony_fx6', category: 'camera_body', name: 'Sony FX6', brand: 'Sony' },
  { id: 'cam_canon_r5', category: 'camera_body', name: 'Canon EOS R5', brand: 'Canon' },
  { id: 'cam_canon_r6', category: 'camera_body', name: 'Canon EOS R6', brand: 'Canon' },
  { id: 'cam_canon_r6ii', category: 'camera_body', name: 'Canon EOS R6 Mark II', brand: 'Canon' },
  { id: 'cam_canon_r8', category: 'camera_body', name: 'Canon EOS R8', brand: 'Canon' },
  { id: 'cam_canon_5d4', category: 'camera_body', name: 'Canon 5D Mark IV', brand: 'Canon' },
  { id: 'cam_canon_6d2', category: 'camera_body', name: 'Canon 6D Mark II', brand: 'Canon' },
  { id: 'cam_nikon_z6ii', category: 'camera_body', name: 'Nikon Z6 II', brand: 'Nikon' },
  { id: 'cam_nikon_z7ii', category: 'camera_body', name: 'Nikon Z7 II', brand: 'Nikon' },
  { id: 'cam_nikon_z8', category: 'camera_body', name: 'Nikon Z8', brand: 'Nikon' },
  { id: 'cam_nikon_z9', category: 'camera_body', name: 'Nikon Z9', brand: 'Nikon' },
  { id: 'cam_nikon_d850', category: 'camera_body', name: 'Nikon D850', brand: 'Nikon' },
  { id: 'cam_fuji_xt4', category: 'camera_body', name: 'Fujifilm X-T4', brand: 'Fujifilm' },
  { id: 'cam_fuji_xt5', category: 'camera_body', name: 'Fujifilm X-T5', brand: 'Fujifilm' },
  { id: 'cam_fuji_xh2', category: 'camera_body', name: 'Fujifilm X-H2', brand: 'Fujifilm' },
  { id: 'cam_panasonic_s5', category: 'camera_body', name: 'Panasonic Lumix S5 II', brand: 'Panasonic' },
  { id: 'cam_panasonic_gh6', category: 'camera_body', name: 'Panasonic Lumix GH6', brand: 'Panasonic' },
  { id: 'cam_blackmagic_6k', category: 'camera_body', name: 'Blackmagic Pocket 6K', brand: 'Blackmagic' },
  { id: 'cam_bmpcc_4k', category: 'camera_body', name: 'Blackmagic Pocket 4K', brand: 'Blackmagic' },

  // Lenses
  { id: 'lens_2470_28', category: 'lens', name: '24-70mm f/2.8' },
  { id: 'lens_70200_28', category: 'lens', name: '70-200mm f/2.8' },
  { id: 'lens_1635_28', category: 'lens', name: '16-35mm f/2.8' },
  { id: 'lens_1535_28', category: 'lens', name: '15-35mm f/2.8' },
  { id: 'lens_50_12', category: 'lens', name: '50mm f/1.2' },
  { id: 'lens_50_14', category: 'lens', name: '50mm f/1.4' },
  { id: 'lens_50_18', category: 'lens', name: '50mm f/1.8' },
  { id: 'lens_85_12', category: 'lens', name: '85mm f/1.2' },
  { id: 'lens_85_14', category: 'lens', name: '85mm f/1.4' },
  { id: 'lens_85_18', category: 'lens', name: '85mm f/1.8' },
  { id: 'lens_35_14', category: 'lens', name: '35mm f/1.4' },
  { id: 'lens_35_18', category: 'lens', name: '35mm f/1.8' },
  { id: 'lens_135_18', category: 'lens', name: '135mm f/1.8' },
  { id: 'lens_24_14', category: 'lens', name: '24mm f/1.4' },
  { id: 'lens_100_macro', category: 'lens', name: '100mm Macro' },
  { id: 'lens_100500', category: 'lens', name: '100-500mm' },
  { id: 'lens_tamron_2875', category: 'lens', name: 'Tamron 28-75mm f/2.8', brand: 'Tamron' },
  { id: 'lens_sigma_2470', category: 'lens', name: 'Sigma 24-70mm f/2.8', brand: 'Sigma' },
  { id: 'lens_sigma_35', category: 'lens', name: 'Sigma 35mm f/1.4 Art', brand: 'Sigma' },
  { id: 'lens_sigma_50', category: 'lens', name: 'Sigma 50mm f/1.4 Art', brand: 'Sigma' },

  // Gimbals
  { id: 'gim_dji_rs3', category: 'gimbal', name: 'DJI RS 3', brand: 'DJI' },
  { id: 'gim_dji_rs3pro', category: 'gimbal', name: 'DJI RS 3 Pro', brand: 'DJI' },
  { id: 'gim_dji_rs4', category: 'gimbal', name: 'DJI RS 4', brand: 'DJI' },
  { id: 'gim_dji_rs4pro', category: 'gimbal', name: 'DJI RS 4 Pro', brand: 'DJI' },
  { id: 'gim_zhiyun_crane3', category: 'gimbal', name: 'Zhiyun Crane 3S', brand: 'Zhiyun' },
  { id: 'gim_zhiyun_weebill', category: 'gimbal', name: 'Zhiyun Weebill 3S', brand: 'Zhiyun' },
  { id: 'gim_moza_aircross', category: 'gimbal', name: 'Moza AirCross 3', brand: 'Moza' },

  // Drones
  { id: 'drone_mavic3', category: 'drone', name: 'DJI Mavic 3', brand: 'DJI' },
  { id: 'drone_mavic3pro', category: 'drone', name: 'DJI Mavic 3 Pro', brand: 'DJI' },
  { id: 'drone_mavic3cine', category: 'drone', name: 'DJI Mavic 3 Cine', brand: 'DJI' },
  { id: 'drone_air2s', category: 'drone', name: 'DJI Air 2S', brand: 'DJI' },
  { id: 'drone_air3', category: 'drone', name: 'DJI Air 3', brand: 'DJI' },
  { id: 'drone_mini4pro', category: 'drone', name: 'DJI Mini 4 Pro', brand: 'DJI' },
  { id: 'drone_mini3pro', category: 'drone', name: 'DJI Mini 3 Pro', brand: 'DJI' },
  { id: 'drone_inspire2', category: 'drone', name: 'DJI Inspire 2', brand: 'DJI' },
  { id: 'drone_fpv', category: 'drone', name: 'DJI FPV', brand: 'DJI' },
  { id: 'drone_avata2', category: 'drone', name: 'DJI Avata 2', brand: 'DJI' },

  // Lighting
  { id: 'light_godox_ad600', category: 'lighting', name: 'Godox AD600 Pro', brand: 'Godox' },
  { id: 'light_godox_ad400', category: 'lighting', name: 'Godox AD400 Pro', brand: 'Godox' },
  { id: 'light_godox_ad200', category: 'lighting', name: 'Godox AD200 Pro', brand: 'Godox' },
  { id: 'light_godox_v1', category: 'lighting', name: 'Godox V1', brand: 'Godox' },
  { id: 'light_godox_v860', category: 'lighting', name: 'Godox V860 III', brand: 'Godox' },
  { id: 'light_profoto_b10', category: 'lighting', name: 'Profoto B10', brand: 'Profoto' },
  { id: 'light_profoto_b10x', category: 'lighting', name: 'Profoto B10X', brand: 'Profoto' },
  { id: 'light_profoto_a1x', category: 'lighting', name: 'Profoto A1X', brand: 'Profoto' },
  { id: 'light_aputure_120d', category: 'lighting', name: 'Aputure 120D II', brand: 'Aputure' },
  { id: 'light_aputure_300x', category: 'lighting', name: 'Aputure LS 300X', brand: 'Aputure' },
  { id: 'light_aputure_mc', category: 'lighting', name: 'Aputure MC', brand: 'Aputure' },
  { id: 'light_nanlite_pavotube', category: 'lighting', name: 'Nanlite PavoTube II', brand: 'Nanlite' },
  { id: 'light_led_panel', category: 'lighting', name: 'LED Panel (Bi-Color)' },
  { id: 'light_softbox', category: 'lighting', name: 'Softbox' },
  { id: 'light_umbrella', category: 'lighting', name: 'Reflective Umbrella' },
  { id: 'light_ring_light', category: 'lighting', name: 'Ring Light' },

  // Audio
  { id: 'audio_rode_wireless', category: 'audio', name: 'Rode Wireless GO II', brand: 'Rode' },
  { id: 'audio_rode_videomic', category: 'audio', name: 'Rode VideoMic Pro+', brand: 'Rode' },
  { id: 'audio_zoom_h6', category: 'audio', name: 'Zoom H6 Recorder', brand: 'Zoom' },
  { id: 'audio_zoom_h5', category: 'audio', name: 'Zoom H5 Recorder', brand: 'Zoom' },
  { id: 'audio_dji_mic', category: 'audio', name: 'DJI Mic', brand: 'DJI' },
  { id: 'audio_sony_uwp', category: 'audio', name: 'Sony UWP-D21 Wireless', brand: 'Sony' },
  { id: 'audio_sennheiser_ew', category: 'audio', name: 'Sennheiser EW 112P', brand: 'Sennheiser' },
  { id: 'audio_lav_mic', category: 'audio', name: 'Lavalier Mic' },
  { id: 'audio_shotgun_mic', category: 'audio', name: 'Shotgun Mic' },

  // Accessories
  { id: 'acc_tripod', category: 'accessory', name: 'Tripod' },
  { id: 'acc_tripod_heavy', category: 'accessory', name: 'Heavy-Duty Tripod' },
  { id: 'acc_monopod', category: 'accessory', name: 'Monopod' },
  { id: 'acc_reflector', category: 'accessory', name: '5-in-1 Reflector' },
  { id: 'acc_light_stand', category: 'accessory', name: 'Light Stand' },
  { id: 'acc_c_stand', category: 'accessory', name: 'C-Stand' },
  { id: 'acc_sandbag', category: 'accessory', name: 'Sandbag' },
  { id: 'acc_battery_grip', category: 'accessory', name: 'Battery Grip' },
  { id: 'acc_memory_cards', category: 'accessory', name: 'Memory Cards' },
  { id: 'acc_hdmi_monitor', category: 'accessory', name: 'External Monitor' },
  { id: 'acc_vmount_battery', category: 'accessory', name: 'V-Mount Battery' },
  { id: 'acc_wireless_trigger', category: 'accessory', name: 'Wireless Flash Trigger' },
  { id: 'acc_backdrop_stand', category: 'accessory', name: 'Backdrop Stand' },
  { id: 'acc_camera_bag', category: 'accessory', name: 'Camera Bag' },
  { id: 'acc_handheld_stabilizer', category: 'accessory', name: 'Handheld Stabilizer' },
  { id: 'acc_cage_rig', category: 'accessory', name: 'Camera Cage / Rig' },
  { id: 'acc_follow_focus', category: 'accessory', name: 'Follow Focus' },
  { id: 'acc_matte_box', category: 'accessory', name: 'Matte Box' },
];

// ─────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────

export function searchEquipment(query: string): EquipmentItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return EQUIPMENT_CATALOG;

  return EQUIPMENT_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.brand && item.brand.toLowerCase().includes(q))
  );
}

export function getEquipmentByCategory(category: EquipmentCategory): EquipmentItem[] {
  return EQUIPMENT_CATALOG.filter((item) => item.category === category);
}

export function getEquipmentGrouped(): Record<EquipmentCategory, EquipmentItem[]> {
  const grouped: Partial<Record<EquipmentCategory, EquipmentItem[]>> = {};
  EQUIPMENT_CATALOG.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  });
  return grouped as Record<EquipmentCategory, EquipmentItem[]>;
}

// ─────────────────────────────────────────────────────────────
// SERVICE AREAS
// ─────────────────────────────────────────────────────────────

export type TravelRange =
  | 'local_only'
  | 'within_30km'
  | 'anywhere_in_city'
  | 'anywhere_in_country';

export const TRAVEL_RANGE_LABELS: Record<TravelRange, string> = {
  local_only: 'Local area only',
  within_30km: 'Within 30 km',
  anywhere_in_city: 'Anywhere in city',
  anywhere_in_country: 'Anywhere in Pakistan',
};

export const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot',
  'Gujranwala', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Mirpur Khas', 'Abbottabad', 'Mardan', 'Gujrat', 'Kasur',
  'Rahim Yar Khan', 'Sahiwal', 'Okara', 'Wah Cantt', 'Dera Ghazi Khan',
];

export const KARACHI_AREAS = [
  'DHA', 'Clifton', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'Bahria Town',
  'PECHS', 'North Nazimabad', 'Nazimabad', 'Federal B Area', 'Korangi',
  'Landhi', 'Malir', 'Saddar', 'Garden', 'Lyari',
  'Orangi Town', 'Baldia', 'Surjani Town', 'Scheme 33', 'Gadap',
];

export const LAHORE_AREAS = [
  'DHA Lahore', 'Bahria Town Lahore', 'Gulberg', 'Model Town', 'Johar Town',
  'Wapda Town', 'Askari', 'Cantt', 'Iqbal Town', 'Township',
  'Faisal Town', 'Green Town', 'Shadman', 'Garden Town',
];

export const ISLAMABAD_AREAS = [
  'F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-6', 'G-9', 'G-10', 'G-11', 'E-11',
  'DHA Islamabad', 'Bahria Town', 'Gulberg Greens', 'Rawalpindi Cantt',
  'Satellite Town', 'Bahria Town Phase 8',
];

export function getAreasForCity(city: string): string[] {
  const c = city.trim().toLowerCase();
  if (c.includes('karachi')) return KARACHI_AREAS;
  if (c.includes('lahore')) return LAHORE_AREAS;
  if (c.includes('islamabad') || c.includes('rawalpindi')) return ISLAMABAD_AREAS;
  return [];
}

// ─────────────────────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  'Wedding', 'Mehndi', 'Baraat', 'Walima', 'Engagement', 'Nikkah', 'Bridal Shower', 'Dholki',
  'Aqiqah', 'Birthday', 'Baby Shower', 'Anniversary', 'Family Portrait', 'Reunion',
  'Graduation', 'Convocation', 'Farewell Party', 'Annual Day',
  'Corporate Event', 'Conference', 'Seminar', 'Product Launch', 'Award Ceremony', 'Exhibition', 'Trade Show', 'Networking Event',
  'Portrait Session', 'Maternity Shoot', 'Newborn Shoot', 'Pre-Wedding Shoot', 'Post-Wedding Shoot', 'Fashion Shoot', 'Model Portfolio', 'Personal Branding',
  'Product Shoot', 'Food Photography', 'Real Estate Shoot', 'Interior Shoot', 'E-commerce Shoot', 'Brand Campaign',
  'Concert', 'Music Video', 'Theater / Play', 'DJ Event', 'Cultural Event',
  'Eid Event', 'Ramadan Event', 'Religious Gathering', 'Charity Event', 'Community Event',
  'Sports Event', 'Tournament', 'Documentary', 'Travel Shoot', 'Vlog / YouTube', 'Behind the Scenes',
  'All Events', 'Other',
];

export const EVENT_TYPE_GROUPS: Record<string, string[]> = {
  'Wedding Season': ['Wedding', 'Mehndi', 'Baraat', 'Walima', 'Engagement', 'Nikkah', 'Bridal Shower', 'Dholki'],
  'Family Events': ['Aqiqah', 'Birthday', 'Baby Shower', 'Anniversary', 'Family Portrait', 'Reunion'],
  'Academic': ['Graduation', 'Convocation', 'Farewell Party', 'Annual Day'],
  'Corporate': ['Corporate Event', 'Conference', 'Seminar', 'Product Launch', 'Award Ceremony', 'Exhibition', 'Trade Show', 'Networking Event'],
  'Portraits & Personal': ['Portrait Session', 'Maternity Shoot', 'Newborn Shoot', 'Pre-Wedding Shoot', 'Post-Wedding Shoot', 'Fashion Shoot', 'Model Portfolio', 'Personal Branding'],
  'Commercial & Product': ['Product Shoot', 'Food Photography', 'Real Estate Shoot', 'Interior Shoot', 'E-commerce Shoot', 'Brand Campaign'],
  'Entertainment': ['Concert', 'Music Video', 'Theater / Play', 'DJ Event', 'Cultural Event'],
  'Religious & Community': ['Eid Event', 'Ramadan Event', 'Religious Gathering', 'Charity Event', 'Community Event'],
  'Sports & Others': ['Sports Event', 'Tournament', 'Documentary', 'Travel Shoot', 'Vlog / YouTube', 'Behind the Scenes'],
  'General': ['All Events', 'Other'],
};

// ─────────────────────────────────────────────────────────────
// RATE UNITS
// ─────────────────────────────────────────────────────────────

export type RateUnit = 'per_event' | 'per_hour' | 'per_day' | 'per_project';

export const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  per_event: 'Per Event',
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_project: 'Per Project',
};