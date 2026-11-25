import { PhotoCategoryId, ToneMood } from '../engine/stillColorEngine';

export interface PhotoOfTheDay {
  id: string;
  slotLabel: string;
  title: string;
  locationNote: string;
  categoryId: PhotoCategoryId;
  categoryLabel: string;
  featuredPresetId: string;
  featuredPresetCode: string;
  featuredPresetName: string;
  recommendedTone: ToneMood;
  imageUrl: string;
  /** Guaranteed offline bundled STILL. plate used automatically when offline */
  fallbackImageUrl: string;
}

export interface CategoryShowcase {
  categoryId: PhotoCategoryId;
  indexCode: string;
  name: string;
  tagline: string;
  examples: string;
  coverUrl: string;
}

export interface SampleEditorialPlate {
  id: string;
  name: string;
  categoryId: PhotoCategoryId;
  suggestedTone: ToneMood;
  imageUrl: string;
}

type PhotoOfTheDayCandidate = Omit<PhotoOfTheDay, 'slotLabel'>;

const unsplashEditorialUrl = (photoId: string): string =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1080&h=1440&q=82`;

const LOCAL_FALLBACK_BY_CATEGORY: Record<PhotoCategoryId, string> = {
  editorial: '/src/assets/images/still_editorial_magazine_1795627763048.jpg',
  nature: '/src/assets/images/still_nature_waterfall_1795626361058.jpg',
  coastal: '/src/assets/images/still_coastal_coffee_1795626361719.jpg',
  portrait: '/src/assets/images/still_featured_editorial_1795624812903.jpg',
  architecture: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  street: '/src/assets/images/still_preset_atelier_1795624816961.jpg',
  'still-life': '/src/assets/images/still_preset_warm_stone_1795624815441.jpg',
  'food-coffee': '/src/assets/images/still_coastal_coffee_1795626361719.jpg',
  night: '/src/assets/images/still_night_cafe_1795626362421.jpg',
  monochrome: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  'self-portrait': '/src/assets/images/still_self_portrait_cover_1795631413100.jpg',
  'icons-25': '/src/assets/images/still_icons_cameras_cover_1795631412428.jpg',
  cinema: '/src/assets/images/still_cinema_cover_1795645547158.jpg',
  darkroom: '/src/assets/images/still_darkroom_cover_1795645547555.jpg',
  'golden-dream': '/src/assets/images/still_golden_dream_cover_1795645548120.jpg',
};

interface RawCuratedPlate {
  photoId: string;
  title: string;
  presetId: string;
  presetCode: string;
  presetName: string;
  tone: ToneMood;
}

const CURATED_ONLINE_BY_CATEGORY: Record<
  PhotoCategoryId,
  { label: string; plates: RawCuratedPlate[] }
> = {
  editorial: {
    label: 'Editorial',
    plates: [
      { photoId: 'photo-1515886657613-9f3515b0c78f', title: 'Amber Silhouette', presetId: 'ed-01', presetCode: 'ED-01', presetName: 'Paper Spread', tone: 'bright' },
      { photoId: 'photo-1509631179647-0177331693ae', title: 'Runway Linen Study', presetId: 'ed-03', presetCode: 'ED-03', presetName: 'Atelier Offset', tone: 'bright' },
      { photoId: 'photo-1496747611176-843222e1e57c', title: 'Ivory Silk Terrace', presetId: 'ed-02', presetCode: 'ED-02', presetName: 'Linen Daylight', tone: 'bright' },
      { photoId: 'photo-1483985988355-763728e1935b', title: 'Avenue Editorial', presetId: 'ed-05', presetCode: 'ED-05', presetName: 'Chiaroscuro Press', tone: 'dark' },
      { photoId: 'photo-1539109136881-3be0616acf4b', title: 'Atelier Coat Study', presetId: 'ed-06', presetCode: 'ED-06', presetName: 'Lith Velvet', tone: 'dark' },
      { photoId: 'photo-1469334031218-e382a71b716b', title: 'Golden Hour Spread', presetId: 'ed-04', presetCode: 'ED-04', presetName: 'Warm Press', tone: 'bright' },
    ],
  },
  nature: {
    label: 'Nature',
    plates: [
      { photoId: 'photo-1506744038136-46273834b3fb', title: 'Yosemite Valley Mirror', presetId: 'nt-01', presetCode: 'NT-01', presetName: 'Morning Mist', tone: 'bright' },
      { photoId: 'photo-1441974231531-c6227db76b6e', title: 'Sunlit Cedar Canopy', presetId: 'nt-02', presetCode: 'NT-02', presetName: 'Sunlit Canopy', tone: 'bright' },
      { photoId: 'photo-1470071459604-3b5ec3a7fe05', title: 'Alpine Ridge Fog', presetId: 'nt-05', presetCode: 'NT-05', presetName: 'Nordic Pine', tone: 'dark' },
      { photoId: 'photo-1433086966358-54859d0ed716', title: 'Mossy Stone Cascade', presetId: 'nt-07', presetCode: 'NT-07', presetName: 'Chlorophyll Silver', tone: 'dark' },
      { photoId: 'photo-1501785888041-af3ef285b470', title: 'Dolomite Emerald Lake', presetId: 'nt-04', presetCode: 'NT-04', presetName: 'Alpine Slate', tone: 'bright' },
      { photoId: 'photo-1469474968028-56623f02e42e', title: 'Highland Dawn Mist', presetId: 'nt-03', presetCode: 'NT-03', presetName: 'Botanical 160', tone: 'bright' },
    ],
  },
  coastal: {
    label: 'Coastal',
    plates: [
      { photoId: 'photo-1507525428034-b723cf961d3e', title: 'Salt Morning Tide', presetId: 'cs-01', presetCode: 'CS-01', presetName: 'Salt Horizon', tone: 'bright' },
      { photoId: 'photo-1505118380757-91f5f5632de0', title: 'Aegean Blue Horizon', presetId: 'cs-02', presetCode: 'CS-02', presetName: 'Amalfi 160', tone: 'bright' },
      { photoId: 'photo-1519046904884-53103b34b206', title: 'Sun-Bleached Shoreline', presetId: 'cs-03', presetCode: 'CS-03', presetName: 'Chalk Drift', tone: 'bright' },
      { photoId: 'photo-1473116763249-2faaef81ccda', title: 'Mediterranean Cove', presetId: 'cs-04', presetCode: 'CS-04', presetName: 'Mineral Tide', tone: 'bright' },
      { photoId: 'photo-1500375592092-40eb2168fd21', title: 'Mineral Surf Break', presetId: 'cs-06', presetCode: 'CS-06', presetName: 'Deep Atlantic', tone: 'dark' },
      { photoId: 'photo-1516483638261-f4dbaf036963', title: 'Cinque Terre Cliffs', presetId: 'cs-05', presetCode: 'CS-05', presetName: 'Riviera Dusk', tone: 'dark' },
    ],
  },
  portrait: {
    label: 'Portrait',
    plates: [
      { photoId: 'photo-1534528741775-53994a69daeb', title: 'Soft Daylight Study', presetId: 'pt-01', presetCode: 'PT-01', presetName: 'Silk 160', tone: 'bright' },
      { photoId: 'photo-1531746020798-e6953c6e8e04', title: 'Alabaster Studio Light', presetId: 'pt-02', presetCode: 'PT-02', presetName: 'Alabaster Light', tone: 'bright' },
      { photoId: 'photo-1517841905240-472988babdf9', title: 'Film Grain Gaze', presetId: 'pt-03', presetCode: 'PT-03', presetName: 'Portra Veil', tone: 'bright' },
      { photoId: 'photo-1506794778202-cad84cf45f1d', title: 'Warm Chiaroscuro', presetId: 'pt-06', presetCode: 'PT-06', presetName: 'Amber Shadow', tone: 'dark' },
      { photoId: 'photo-1524504388940-b1c1722653e1', title: 'Window Shade Study', presetId: 'pt-04', presetCode: 'PT-04', presetName: 'Warm Porcelain', tone: 'bright' },
      { photoId: 'photo-1544005313-94ddf0286df2', title: 'Quiet Afternoon Frame', presetId: 'pt-07', presetCode: 'PT-07', presetName: 'Platinum Portrait', tone: 'dark' },
    ],
  },
  architecture: {
    label: 'Architecture',
    plates: [
      { photoId: 'photo-1486406146926-c627a92ad1ab', title: 'Glass Facade Geometry', presetId: 'ar-01', presetCode: 'AR-01', presetName: 'Travertine Daylight', tone: 'bright' },
      { photoId: 'photo-1513694203232-719a280e022f', title: 'Nordic Plaster Interior', presetId: 'ar-02', presetCode: 'AR-02', presetName: 'Plaster Gallery', tone: 'bright' },
      { photoId: 'photo-1487958449943-2429e8be8625', title: 'Brutalist Concrete Line', presetId: 'ar-07', presetCode: 'AR-07', presetName: 'Swiss Bleach', tone: 'dark' },
      { photoId: 'photo-1503387762-592deb58ef4e', title: 'Sunlit Stone Atrium', presetId: 'ar-03', presetCode: 'AR-03', presetName: 'Limestone Press', tone: 'bright' },
      { photoId: 'photo-1479839672679-a46483c0e7c8', title: 'Minimalist Archway', presetId: 'ar-05', presetCode: 'AR-05', presetName: 'Monolith Concrete', tone: 'dark' },
      { photoId: 'photo-1545324418-cc1a3fa10c00', title: 'Modernist Courtyard', presetId: 'ar-04', presetCode: 'AR-04', presetName: 'Zinc Shadow', tone: 'dark' },
    ],
  },
  street: {
    label: 'Street',
    plates: [
      { photoId: 'photo-1540959733332-eab4deabeeaf', title: 'Shibuya Dusk Crossing', presetId: 'st-07', presetCode: 'ST-07', presetName: 'Tokyo Fluorescent', tone: 'dark' },
      { photoId: 'photo-1502602898657-3e91760cbb34', title: 'Paris Haussmann Morning', presetId: 'st-01', presetCode: 'ST-01', presetName: '35mm Documentary', tone: 'bright' },
      { photoId: 'photo-1477959858617-67f85cf4f1df', title: 'Downtown Canyon Light', presetId: 'st-03', presetCode: 'ST-03', presetName: 'Midtown 400', tone: 'bright' },
      { photoId: 'photo-1519501025264-65ba15a82390', title: 'Rain-Slicked Avenue', presetId: 'st-06', presetCode: 'ST-06', presetName: 'Rain Asphalt', tone: 'dark' },
      { photoId: 'photo-1493976040374-85c8e12f0c0e', title: 'Kyoto Alley Lanterns', presetId: 'st-05', presetCode: 'ST-05', presetName: 'Subway Tungsten', tone: 'dark' },
      { photoId: 'photo-1449824913935-59a10b8d2000', title: 'Midtown 35mm Walk', presetId: 'st-02', presetCode: 'ST-02', presetName: 'Daylight Reportage', tone: 'bright' },
    ],
  },
  'still-life': {
    label: 'Still Life',
    plates: [
      { photoId: 'photo-1513519245088-0e12902e5a38', title: 'Framed Gallery Wall', presetId: 'sl-01', presetCode: 'SL-01', presetName: 'Porcelain Matte', tone: 'bright' },
      { photoId: 'photo-1490312278390-ab64016e0aa9', title: 'Minimal Botanical Vase', presetId: 'sl-02', presetCode: 'SL-02', presetName: 'Raw Linen', tone: 'bright' },
      { photoId: 'photo-1507473885765-e6ed057f782c', title: 'Warm Ceramic Lamp', presetId: 'sl-06', presetCode: 'SL-06', presetName: 'Obsidian Vessel', tone: 'dark' },
      { photoId: 'photo-1522771739844-6a9f6d5f14af', title: 'Unmade Linen Morning', presetId: 'sl-03', presetCode: 'SL-03', presetName: 'Sandstone Air', tone: 'bright' },
      { photoId: 'photo-1485955900006-10f4d324d411', title: 'Terracotta Stillness', presetId: 'sl-04', presetCode: 'SL-04', presetName: 'Warm Clay', tone: 'bright' },
      { photoId: 'photo-1544457070-4cd773b4d71e', title: 'Oak & Stone Table', presetId: 'sl-07', presetCode: 'SL-07', presetName: 'Flemish Light', tone: 'dark' },
    ],
  },
  'food-coffee': {
    label: 'Food & Coffee',
    plates: [
      { photoId: 'photo-1495474472287-4d71bcdd2085', title: 'Morning Pour-Over', presetId: 'fc-01', presetCode: 'FC-01', presetName: 'Cardamom Cream', tone: 'bright' },
      { photoId: 'photo-1509042239860-f550ce710b93', title: 'Espresso Crema Study', presetId: 'fc-05', presetCode: 'FC-05', presetName: 'Espresso Roast', tone: 'dark' },
      { photoId: 'photo-1442512595331-e89e73853f31', title: 'Hinoki Café Counter', presetId: 'fc-03', presetCode: 'FC-03', presetName: 'Kyoto Hinoki', tone: 'bright' },
      { photoId: 'photo-1514432324607-a09d9b4aefdd', title: 'Ceramic Cup & Shadow', presetId: 'fc-02', presetCode: 'FC-02', presetName: 'Pastry Daylight', tone: 'bright' },
      { photoId: 'photo-1501339847302-ac426a4a7cbb', title: 'Quiet Roastery Table', presetId: 'fc-06', presetCode: 'FC-06', presetName: 'Bistro Amber', tone: 'dark' },
      { photoId: 'photo-1497935586351-b67a49e012bf', title: 'Dark Roast Ritual', presetId: 'fc-07', presetCode: 'FC-07', presetName: 'Dark Cocoa Press', tone: 'dark' },
    ],
  },
  night: {
    label: 'Night',
    plates: [
      { photoId: 'photo-1519681393784-d120267933ba', title: 'Starlight Peak', presetId: 'ng-01', presetCode: 'NG-01', presetName: 'Blue Hour Clear', tone: 'dark' },
      { photoId: 'photo-1514565131-fce0801e5785', title: 'Midnight City Glow', presetId: 'ng-06', presetCode: 'NG-06', presetName: 'Tungsten 800', tone: 'dark' },
      { photoId: 'photo-1508057198894-247b23fe5ade', title: 'Sodium Vapor Street', presetId: 'ng-07', presetCode: 'NG-07', presetName: 'Sodium Dusk', tone: 'dark' },
      { photoId: 'photo-1478760329108-5c3ed9d495a0', title: 'Blue Hour Silhouette', presetId: 'ng-03', presetCode: 'NG-03', presetName: 'Twilight Velvet', tone: 'dark' },
      { photoId: 'photo-1513635269975-59663e0ac1ad', title: 'London Dusk Bridge', presetId: 'ng-04', presetCode: 'NG-04', presetName: 'Ember Window', tone: 'dark' },
      { photoId: 'photo-1470252649378-9c29740c9fa8', title: 'Horizon Afterglow', presetId: 'ng-02', presetCode: 'NG-02', presetName: 'Dusk Lantern', tone: 'bright' },
    ],
  },
  monochrome: {
    label: 'Monochrome',
    plates: [
      { photoId: 'photo-1494522855154-9297ac14b55f', title: 'Silver Gelatin Skyline', presetId: 'mo-01', presetCode: 'MO-01', presetName: 'Silver Gelatin', tone: 'bright' },
      { photoId: 'photo-1500462918059-b1a0cb512f1d', title: 'High-Contrast Geometry', presetId: 'mo-05', presetCode: 'MO-05', presetName: 'Tri-X Darkroom', tone: 'dark' },
      { photoId: 'photo-1485846234645-a62644f84728', title: '35mm Cinema Reel', presetId: 'mo-06', presetCode: 'MO-06', presetName: 'Charcoal Grain', tone: 'dark' },
      { photoId: 'photo-1517245386807-bb43f82c33c4', title: 'Gallery Shadow Play', presetId: 'mo-02', presetCode: 'MO-02', presetName: 'Platinum Paper', tone: 'bright' },
      { photoId: 'photo-1464822759023-fed622ff2c3b', title: 'Granite Summit Noir', presetId: 'mo-07', presetCode: 'MO-07', presetName: 'Selenium Print', tone: 'dark' },
      { photoId: 'photo-1497366216548-37526070297c', title: 'Architectural Corridor', presetId: 'mo-03', presetCode: 'MO-03', presetName: 'Ilford Matte', tone: 'bright' },
    ],
  },
  'self-portrait': {
    label: 'Self-Portrait',
    plates: [
      { photoId: 'photo-1529626455594-4ff0802cfb7e', title: 'Sunlit Window Dew', presetId: 'sp-01', presetCode: 'SP-01', presetName: 'Soft Dew', tone: 'bright' },
      { photoId: 'photo-1508214751196-bcfd4ca60f91', title: 'Warm Daylight Close-Up', presetId: 'sp-02', presetCode: 'SP-02', presetName: 'Sunlit Peach', tone: 'bright' },
      { photoId: 'photo-1494790108377-be9c29b29330', title: 'Natural Glow Study', presetId: 'sp-03', presetCode: 'SP-03', presetName: 'Clean Editorial', tone: 'bright' },
      { photoId: 'photo-1524502397800-2eeaad7c3fe5', title: 'Editorial Mirror Light', presetId: 'sp-04', presetCode: 'SP-04', presetName: 'Mirror Flash', tone: 'bright' },
      { photoId: 'photo-1507003211169-0a1dd7228f2d', title: 'Soft Shadow Portrait', presetId: 'sp-05', presetCode: 'SP-05', presetName: 'Velvet Dusk', tone: 'dark' },
      { photoId: 'photo-1519699047748-de8e457a634e', title: 'Golden Rim Profile', presetId: 'sp-07', presetCode: 'SP-07', presetName: '2000s Digicam', tone: 'bright' },
    ],
  },
  'icons-25': {
    label: 'Icons 25',
    plates: [
      { photoId: 'photo-1495121553079-4c61bcce1894', title: 'Analog 35mm Rangefinder', presetId: 'ic-04', presetCode: 'IC-04', presetName: 'Leica M Natural', tone: 'bright' },
      { photoId: 'photo-1516035069371-29a1b244cc32', title: 'Classic Lens Optics', presetId: 'ic-01', presetCode: 'IC-01', presetName: 'GR Positive', tone: 'bright' },
      { photoId: 'photo-1502920917128-1aa500764cbd', title: 'Vintage Film Camera', presetId: 'ic-07', presetCode: 'IC-07', presetName: 'Portra 400 Classic', tone: 'bright' },
      { photoId: 'photo-1452587925148-ce544e77e70d', title: 'Darkroom Contact Frame', presetId: 'ic-13', presetCode: 'IC-13', presetName: '800T Halation', tone: 'dark' },
      { photoId: 'photo-1526170375885-4d8ecf77b99f', title: 'Instant Film Classic', presetId: 'ic-19', presetCode: 'IC-19', presetName: 'SX-70 Instant', tone: 'bright' },
      { photoId: 'photo-1471341971476-ae15ff5dd4ea', title: 'Rangefinder Street Walk', presetId: 'ic-02', presetCode: 'IC-02', presetName: 'Classic Chrome', tone: 'dark' },
    ],
  },
  cinema: {
    label: 'Cinema',
    plates: [
      { photoId: 'photo-1489599849927-2ee91cede3ba', title: 'Theatrical Screening Still', presetId: 'cn-01', presetCode: 'CN-01', presetName: '2383 Print', tone: 'dark' },
      { photoId: 'photo-1518676590629-3dcbd9c5a5c9', title: 'Emerald Rain Boulevard', presetId: 'cn-02', presetCode: 'CN-02', presetName: 'Chungking 94', tone: 'dark' },
      { photoId: 'photo-1517604931442-7e0c8ed2963c', title: 'Velvet Matinee Symmetry', presetId: 'cn-03', presetCode: 'CN-03', presetName: 'Grand Pastel', tone: 'bright' },
      { photoId: 'photo-1478720568477-152d9b164e26', title: 'Midnight Projection Glow', presetId: 'cn-06', presetCode: 'CN-06', presetName: 'Neo-Noir 2049', tone: 'dark' },
      { photoId: 'photo-1536440136628-849c177e76a1', title: '35mm Anamorphic Reel', presetId: 'cn-07', presetCode: 'CN-07', presetName: '35mm Anamorphic', tone: 'dark' },
      { photoId: 'photo-1509198397868-475647b2a1e5', title: 'Late Night Neon Frame', presetId: 'cn-02', presetCode: 'CN-02', presetName: 'Chungking 94', tone: 'dark' },
    ],
  },
  darkroom: {
    label: 'Darkroom & Cult',
    plates: [
      { photoId: 'photo-1542204165-65bf26472b9b', title: 'Darkroom Contact Archive', presetId: 'dk-01', presetCode: 'DK-01', presetName: 'Classic Neg', tone: 'bright' },
      { photoId: 'photo-1465146344425-f00d5f5c8f07', title: 'Crimson Foliage Infrared', presetId: 'dk-04', presetCode: 'DK-04', presetName: 'Aerochrome Rose', tone: 'bright' },
      { photoId: 'photo-1504198458649-3128b932f49e', title: 'Sun-Warmed Instant Frame', presetId: 'dk-05', presetCode: 'DK-05', presetName: 'SX-70 Milk', tone: 'bright' },
      { photoId: 'photo-1518709268805-4e9042af9f23', title: 'Silver Steel Silhouette', presetId: 'dk-03', presetCode: 'DK-03', presetName: 'Bleach Bypass', tone: 'dark' },
      { photoId: 'photo-1520962880247-cfaf541c8724', title: 'Attic Expired 98 Roll', presetId: 'dk-06', presetCode: 'DK-06', presetName: 'Expired 98', tone: 'bright' },
      { photoId: 'photo-1501854140801-50d01698950b', title: 'Alpine Infrared Canopy', presetId: 'dk-04', presetCode: 'DK-04', presetName: 'Aerochrome Rose', tone: 'bright' },
    ],
  },
  'golden-dream': {
    label: 'Golden & Dream',
    plates: [
      { photoId: 'photo-1495567720989-cebdbdd97913', title: 'Tuscan Amber Horizon', presetId: 'gd-02', presetCode: 'GD-02', presetName: 'Tuscany Gold', tone: 'bright' },
      { photoId: 'photo-1472214103451-9374bd1c798e', title: 'Pro-Mist Sunlit Valley', presetId: 'gd-01', presetCode: 'GD-01', presetName: 'Pro-Mist 1/4', tone: 'bright' },
      { photoId: 'photo-1494548162494-384bba4ab999', title: 'Velvet Peach Horizon', presetId: 'gd-03', presetCode: 'GD-03', presetName: 'Velvet Peach', tone: 'bright' },
      { photoId: 'photo-1499346030926-9a72daac6c63', title: 'Opal Morning Clouds', presetId: 'gd-04', presetCode: 'GD-04', presetName: 'Morning Opal', tone: 'bright' },
      { photoId: 'photo-1500530855697-b586d89ba3ee', title: 'Golden Highway Drift', presetId: 'gd-02', presetCode: 'GD-02', presetName: 'Tuscany Gold', tone: 'bright' },
      { photoId: 'photo-1475924156734-496f6cac6ec1', title: 'Gilded Coastline Dusk', presetId: 'gd-07', presetCode: 'GD-07', presetName: 'Gilded Dusk', tone: 'dark' },
    ],
  },
};

const CATEGORY_ROTATION_ORDER: PhotoCategoryId[] = [
  'cinema',
  'golden-dream',
  'editorial',
  'darkroom',
  'nature',
  'night',
  'coastal',
  'architecture',
  'portrait',
  'street',
  'food-coffee',
  'still-life',
  'monochrome',
  'self-portrait',
  'icons-25',
];

/**
 * 90 curated, CORS-verified online editorial photos (6 per category × 15 categories)
 * with guaranteed offline local fallback plates.
 */
export const PHOTO_OF_THE_DAY_POOL: PhotoOfTheDayCandidate[] =
  CATEGORY_ROTATION_ORDER.flatMap((categoryId) => {
    const group = CURATED_ONLINE_BY_CATEGORY[categoryId];
    return group.plates.map((plate, index) => ({
      id: `potd-${categoryId}-${index + 1}`,
      title: plate.title,
      locationNote: `${group.label.toUpperCase()} · ${plate.presetName.toUpperCase()}`,
      categoryId,
      categoryLabel: group.label,
      featuredPresetId: plate.presetId,
      featuredPresetCode: plate.presetCode,
      featuredPresetName: plate.presetName,
      recommendedTone: plate.tone,
      imageUrl: unsplashEditorialUrl(plate.photoId),
      fallbackImageUrl: LOCAL_FALLBACK_BY_CATEGORY[categoryId],
    }));
  });

export function getLocalCalendarKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyEditionLabel(date: Date = new Date()): string {
  return date
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase();
}

/**
 * Deterministic daily rotation across all 15 categories & 90 curated online plates:
 * - Picks 3 guaranteed-distinct categories every calendar day (covering all 15 categories every 5 days).
 * - Rotates through all 6 plates per category across cycles so photos feel genuinely fresh daily.
 * - Falls back seamlessly to bundled offline plates whenever offline.
 */
export function getDailyPhotosOfTheDay(date: Date = new Date()): PhotoOfTheDay[] {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
  const catCount = CATEGORY_ROTATION_ORDER.length; // 15
  const daysPerCycle = Math.max(1, Math.ceil(catCount / 3)); // 5 -> covers 5 × 3 = 15 unique categories
  const dayInCycle = ((dayNumber % daysPerCycle) + daysPerCycle) % daysPerCycle;
  const cycleIndex = Math.floor(dayNumber / daysPerCycle);

  const picked: PhotoOfTheDay[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const catIdx = (dayInCycle * 3 + slot) % catCount;
    const categoryId = CATEGORY_ROTATION_ORDER[catIdx];
    const group = CURATED_ONLINE_BY_CATEGORY[categoryId];
    const plateIdx =
      ((cycleIndex + slot * 2 + dayInCycle) % group.plates.length +
        group.plates.length) %
      group.plates.length;
    const plate = group.plates[plateIdx];

    picked.push({
      id: `potd-${categoryId}-${plateIdx + 1}`,
      slotLabel: `0${slot + 1} / 03`,
      title: plate.title,
      locationNote: `${group.label.toUpperCase()} · ${plate.presetName.toUpperCase()}`,
      categoryId,
      categoryLabel: group.label,
      featuredPresetId: plate.presetId,
      featuredPresetCode: plate.presetCode,
      featuredPresetName: plate.presetName,
      recommendedTone: plate.tone,
      imageUrl: unsplashEditorialUrl(plate.photoId),
      fallbackImageUrl: LOCAL_FALLBACK_BY_CATEGORY[categoryId],
    });
  }

  return picked;
}

/**
 * Default daily Photos of the Day snapshot (evaluated for today's date).
 */
export const PHOTOS_OF_THE_DAY: PhotoOfTheDay[] = getDailyPhotosOfTheDay();

export const CATEGORY_SHOWCASES: CategoryShowcase[] = [
  {
    categoryId: 'editorial',
    indexCode: '01',
    name: 'Editorial',
    tagline: 'Independent fashion magazine spreads, offset press, and lith print.',
    examples: 'Magazine · Fashion · Lookbook',
    coverUrl: '/src/assets/images/still_editorial_magazine_1795627763048.jpg',
  },
  {
    categoryId: 'nature',
    indexCode: '02',
    name: 'Nature',
    tagline: 'Waterfalls, mist, mossy basalt, and silver-toned forest light.',
    examples: 'Waterfalls · Forests · Botanicals',
    coverUrl: '/src/assets/images/still_nature_waterfall_1795626361058.jpg',
  },
  {
    categoryId: 'coastal',
    indexCode: '03',
    name: 'Coastal',
    tagline: 'Sun-bleached horizons, salt air, mineral tides, and cyanotype.',
    examples: 'Ocean · Beaches · Horizon',
    coverUrl: '/src/assets/images/still_coastal_coffee_1795626361719.jpg',
  },
  {
    categoryId: 'portrait',
    indexCode: '04',
    name: 'Portrait',
    tagline: 'Editorial skin fidelity, alabaster daylight, and platinum toning.',
    examples: 'People · Portraits · Studio',
    coverUrl: '/src/assets/images/still_featured_editorial_1795624812903.jpg',
  },
  {
    categoryId: 'architecture',
    indexCode: '05',
    name: 'Architecture',
    tagline: 'Travertine stone, Swiss bleach-bypass, and shadow geometry.',
    examples: 'Interiors · Facades · Concrete',
    coverUrl: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  },
  {
    categoryId: 'street',
    indexCode: '06',
    name: 'Street',
    tagline: '35mm documentary clarity, fluorescent stations, and rain asphalt.',
    examples: 'City · Travel · Documentary',
    coverUrl: '/src/assets/images/still_preset_atelier_1795624816961.jpg',
  },
  {
    categoryId: 'still-life',
    indexCode: '07',
    name: 'Still Life',
    tagline: 'Unglazed ceramics, linen, and Flemish chiaroscuro stillness.',
    examples: 'Ceramics · Flatlay · Objects',
    coverUrl: '/src/assets/images/still_preset_warm_stone_1795624815441.jpg',
  },
  {
    categoryId: 'food-coffee',
    indexCode: '08',
    name: 'Food & Coffee',
    tagline: 'Kyoto hinoki wood cafés, espresso roast, and cardamom cream.',
    examples: 'Espresso · Pastry · Dining',
    coverUrl: '/src/assets/images/still_coastal_coffee_1795626361719.jpg',
  },
  {
    categoryId: 'night',
    indexCode: '09',
    name: 'Night',
    tagline: 'Sodium dusk, tungsten 800 cinema grain, and blue hour.',
    examples: 'City Lights · Dusk · Cafés',
    coverUrl: '/src/assets/images/still_night_cafe_1795626362421.jpg',
  },
  {
    categoryId: 'monochrome',
    indexCode: '10',
    name: 'Monochrome',
    tagline: 'Silver gelatin darkroom prints, platinum paper, and selenium.',
    examples: 'Fine Art B&W · Darkroom',
    coverUrl: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  },
  {
    categoryId: 'self-portrait',
    indexCode: '11',
    name: 'Self-Portrait',
    tagline: 'Flattering skin fidelity, delicate Pro-Mist bloom, and natural window light for selfies.',
    examples: 'Selfie · Front Cam · Mirror · Close-Up',
    coverUrl: '/src/assets/images/still_self_portrait_cover_1795631413100.jpg',
  },
  {
    categoryId: 'icons-25',
    indexCode: '12',
    name: 'Icons 25',
    tagline: '25 iconic tributes to classic digital rangefinders, analog film stocks, and timeless color grades.',
    examples: 'Camera Sims · Analog Film · Iconic Looks',
    coverUrl: '/src/assets/images/still_icons_cameras_cover_1795631412428.jpg',
  },
  {
    categoryId: 'cinema',
    indexCode: '13',
    name: 'Cinema',
    tagline: 'Auteur film color science: Kodak 2383 theatrical print, Wong Kar-Wai emerald halation, A24 sun, and neo-noir.',
    examples: '35mm Cinema · Film Stills · Anamorphic',
    coverUrl: '/src/assets/images/still_cinema_cover_1795645547158.jpg',
  },
  {
    categoryId: 'darkroom',
    indexCode: '14',
    name: 'Darkroom & Cult',
    tagline: 'Tactile chemical emulsions: Classic Neg, CineStill 800T halation, silver bleach-bypass, expired rolls, and Aerochrome.',
    examples: 'Cult Film · Infrared · Darkroom Lab',
    coverUrl: '/src/assets/images/still_darkroom_cover_1795645547555.jpg',
  },
  {
    categoryId: 'golden-dream',
    indexCode: '15',
    name: 'Golden & Dream',
    tagline: 'Optical Pro-Mist 1/4 diffusion, sun-drenched Tuscan gold, velvet peach dusk, and luminous editorial haze.',
    examples: 'Golden Hour · Pro-Mist · Dreamy Light',
    coverUrl: '/src/assets/images/still_golden_dream_cover_1795645548120.jpg',
  },
];

/**
 * 15 Editorial Sample Plates — one for every single STILL. category
 * so users can test all 15 categories with one tap from Studio.
 */
export const SAMPLE_PLATES: SampleEditorialPlate[] = [
  {
    id: 'plate-editorial',
    name: 'Magazine Study',
    categoryId: 'editorial',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_editorial_magazine_1795627763048.jpg',
  },
  {
    id: 'plate-waterfall',
    name: 'Waterfall Mist',
    categoryId: 'nature',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_nature_waterfall_1795626361058.jpg',
  },
  {
    id: 'plate-coastal',
    name: 'Amalfi Horizon',
    categoryId: 'coastal',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_coastal_coffee_1795626361719.jpg',
  },
  {
    id: 'plate-portrait',
    name: 'Limestone Arch',
    categoryId: 'portrait',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_featured_editorial_1795624812903.jpg',
  },
  {
    id: 'plate-arch',
    name: 'Travertine Steps',
    categoryId: 'architecture',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  },
  {
    id: 'plate-street',
    name: 'Atelier Street',
    categoryId: 'street',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_preset_atelier_1795624816961.jpg',
  },
  {
    id: 'plate-still-life',
    name: 'Warm Vessel',
    categoryId: 'still-life',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_preset_warm_stone_1795624815441.jpg',
  },
  {
    id: 'plate-coffee',
    name: 'Morning Café',
    categoryId: 'food-coffee',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_preset_botanical_1795624815565.jpg',
  },
  {
    id: 'plate-night',
    name: 'Café Noir Dusk',
    categoryId: 'night',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_night_cafe_1795626362421.jpg',
  },
  {
    id: 'plate-monochrome',
    name: 'Silver Study',
    categoryId: 'monochrome',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_preset_monochrome_1795624813785.jpg',
  },
  {
    id: 'plate-self-portrait',
    name: 'Window Selfie',
    categoryId: 'self-portrait',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_self_portrait_cover_1795631413100.jpg',
  },
  {
    id: 'plate-icons-25',
    name: 'Rangefinder Desk',
    categoryId: 'icons-25',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_icons_cameras_cover_1795631412428.jpg',
  },
  {
    id: 'plate-cinema',
    name: 'Rain Window 2383',
    categoryId: 'cinema',
    suggestedTone: 'dark',
    imageUrl: '/src/assets/images/still_cinema_cover_1795645547158.jpg',
  },
  {
    id: 'plate-darkroom',
    name: 'Terracotta Grain',
    categoryId: 'darkroom',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_darkroom_cover_1795645547555.jpg',
  },
  {
    id: 'plate-golden-dream',
    name: 'Veranda Golden Hour',
    categoryId: 'golden-dream',
    suggestedTone: 'bright',
    imageUrl: '/src/assets/images/still_golden_dream_cover_1795645548120.jpg',
  },
];
