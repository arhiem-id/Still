package com.arhiem.still.domain.model

enum class PhotoCategory(val code: String, val label: String) {
    EDITORIAL("01", "Editorial"),
    NATURE("02", "Nature"),
    COASTAL("03", "Coastal"),
    PORTRAIT("04", "Portrait"),
    ARCHITECTURE("05", "Architecture"),
    STREET("06", "Street"),
    STILL_LIFE("07", "Still Life"),
    FOOD_COFFEE("08", "Food & Coffee"),
    NIGHT("09", "Night"),
    MONOCHROME("10", "Monochrome"),
    SELF_PORTRAIT("11", "Self-Portrait"),
    ICONS_25("12", "Icons 25")
}

/**
 * Live tone toggle applied dynamically on top of any of the 102 STILL. presets.
 */
enum class ToneMood(
    val exposureOffset: Float,
    val contrastOffset: Float,
    val fadeOffset: Float,
    val vignetteOffset: Float
) {
    BRIGHT(11f, -4f, 4f, -8f),
    DARK(-13f, 13f, -3f, 16f)
}

data class ColorFilterPreset(
    val id: String,
    val code: String,
    val name: String,
    val category: PhotoCategory,
    val description: String,
    val isSignature: Boolean = false,
    val exposure: Float = 0f,
    val contrast: Float = 0f,
    val warmth: Float = 0f,
    val saturation: Float = 0f,
    val fade: Float = 0f,
    val grain: Float = 0f,
    val vignette: Float = 0f,
    val highlightTintHex: Long? = null,
    val shadowTintHex: Long? = null,
    val isMonochrome: Boolean = false
)

object BuiltInPresets {
    val all: List<ColorFilterPreset> = listOf(
        // 01 · Editorial
        ColorFilterPreset("ed-01", "ED-01", "Paper Spread", PhotoCategory.EDITORIAL, "Uncoated magazine stock with warm ivory whites and muted ink.", false, 3f, 8f, 8f, -20f, 14f, 14f, 8f, 0xFFEBE3D5, 0xFF2E2B27),
        ColorFilterPreset("ed-02", "ED-02", "Milan 1989", PhotoCategory.EDITORIAL, "Italian fashion archive look: rich wool depth & golden skin roll-off.", false, -2f, 18f, 12f, -14f, 8f, 22f, 18f, 0xFFE2C9A8, 0xFF1E2126),
        ColorFilterPreset("ed-03", "ED-03", "Alabaster Gloss", PhotoCategory.EDITORIAL, "High-fashion cover clarity with cool porcelain highlights.", false, 4f, 16f, -4f, -12f, 4f, 8f, 10f, 0xFFF2F0EC, 0xFF232629),
        ColorFilterPreset("ed-04", "ED-04", "Atelier Print", PhotoCategory.EDITORIAL, "Parisian couture lookbook tone: restrained chroma, sculpted shadows.", false, -3f, 20f, 2f, -26f, 8f, 18f, 20f, 0xFFD6CFC4, 0xFF292724),
        ColorFilterPreset("ed-05", "ED-05", "Offset 1994", PhotoCategory.EDITORIAL, "Four-color offset press ink with warm gray midtones and halftone feel.", false, 2f, 12f, 6f, -28f, 18f, 28f, 14f, 0xFFD9D2C5, 0xFF302D2A),
        ColorFilterPreset("ed-06", "ED-06", "Runway Graphite", PhotoCategory.EDITORIAL, "Cool slate fashion editorial with crisp neutral highlights.", false, -2f, 22f, -10f, -34f, 6f, 16f, 22f, 0xFFDCE0E3, 0xFF1E2329),
        ColorFilterPreset("ed-07", "ED-07", "Lith Print", PhotoCategory.EDITORIAL, "Rare darkroom lith process: toasted ivory highlights & velvety umber.", true, 0f, 22f, 16f, -42f, 14f, 26f, 24f, 0xFFE5CFAF, 0xFF2A1F18),
        // 02 · Nature
        ColorFilterPreset("nt-01", "NT-01", "Cascade Air", PhotoCategory.NATURE, "Crisp waterfall mist, clean mineral whites, and natural emerald depth.", false, 4f, 10f, -6f, -8f, 8f, 12f, 10f, 0xFFDDEAE6, 0xFF212F2C),
        ColorFilterPreset("nt-02", "NT-02", "Sunlit Canopy", PhotoCategory.NATURE, "Filtered woodland daylight with calm ochre-olive leaves.", false, 3f, 8f, 14f, -14f, 10f, 14f, 10f, 0xFFD6C69C, 0xFF292F23),
        ColorFilterPreset("nt-03", "NT-03", "Nordic Lichen", PhotoCategory.NATURE, "Pale Scandinavian moss & silver-sage foliage under overcast sky.", false, 2f, 6f, -8f, -32f, 16f, 16f, 12f, 0xFFE1E4DC, 0xFF2C332E),
        ColorFilterPreset("nt-04", "NT-04", "Deep Moss", PhotoCategory.NATURE, "Dense forest canopy greens paired with rich wet cedar shadows.", false, -4f, 18f, -2f, -20f, 8f, 20f, 24f, 0xFFB8C2B0, 0xFF1E2920),
        ColorFilterPreset("nt-05", "NT-05", "Basalt Rain", PhotoCategory.NATURE, "Volcanic stone contrast and muted slate water for rainy landscapes.", false, -4f, 22f, -14f, -38f, 8f, 22f, 26f, 0xFFCBD4D8, 0xFF212A2E),
        ColorFilterPreset("nt-06", "NT-06", "Cedar Dusk", PhotoCategory.NATURE, "Late forest twilight balancing warm pine bark with cool valley mist.", false, -3f, 16f, 10f, -24f, 12f, 20f, 22f, 0xFFC9AD8E, 0xFF24292B),
        ColorFilterPreset("nt-07", "NT-07", "Chlorophyll Silver", PhotoCategory.NATURE, "Rare medium-format silver-sage rendering turning foliage metallic olive.", true, 0f, 20f, -6f, -48f, 12f, 22f, 18f, 0xFFDCE2D5, 0xFF262E28),
        // 03 · Coastal
        ColorFilterPreset("cs-01", "CS-01", "Salt Paper", PhotoCategory.COASTAL, "Bleached coastal limestone, pale sand, and airy Mediterranean haze.", false, 6f, 2f, 8f, -20f, 16f, 10f, 4f, 0xFFEFE8DC, 0xFF333638),
        ColorFilterPreset("cs-02", "CS-02", "Amalfi 160", PhotoCategory.COASTAL, "Medium-format seaside daylight with warm skin & sea-glass aqua.", false, 4f, 8f, 10f, -10f, 10f, 14f, 8f, 0xFFE5DAC8, 0xFF25353B),
        ColorFilterPreset("cs-03", "CS-03", "Limestone Haze", PhotoCategory.COASTAL, "Chalky midday sun softened into quiet bone and pale slate blue.", false, 5f, -2f, 2f, -30f, 20f, 12f, 6f, 0xFFEAE6DF, 0xFF363C40),
        ColorFilterPreset("cs-04", "CS-04", "Nordic Tide", PhotoCategory.COASTAL, "Stormy Atlantic horizon with cool mineral teal and deep slate waves.", false, -3f, 18f, -18f, -28f, 10f, 20f, 22f, 0xFFC5D3D8, 0xFF1E2D33),
        ColorFilterPreset("cs-05", "CS-05", "Dusk Cove", PhotoCategory.COASTAL, "Twilight shore pairing warm sand highlights with indigo sea shadows.", false, -4f, 18f, 4f, -18f, 8f, 22f, 24f, 0xFFDEC4A8, 0xFF202636),
        ColorFilterPreset("cs-06", "CS-06", "Aegean Slate", PhotoCategory.COASTAL, "Crisp Greek island stone against deep desaturated cobalt water.", false, 1f, 20f, -10f, -22f, 6f, 16f, 16f, 0xFFECEAE4, 0xFF1B2838),
        ColorFilterPreset("cs-07", "CS-07", "Cyanotype Drift", PhotoCategory.COASTAL, "Rare sun-print Prussian blue split tone with chalky paper whites.", true, 2f, 22f, -22f, -30f, 12f, 18f, 16f, 0xFFE7E4DC, 0xFF1A3B52),
        // 04 · Portrait
        ColorFilterPreset("pt-01", "PT-01", "Silk 160", PhotoCategory.PORTRAIT, "Luminous editorial skin tones with creamy highlight compression.", false, 4f, 6f, 10f, -14f, 10f, 12f, 8f, 0xFFECDFCE, 0xFF2D2722),
        ColorFilterPreset("pt-02", "PT-02", "Ivory Daylight", PhotoCategory.PORTRAIT, "Pure northern window light preserving natural complexion & linen.", false, 5f, 4f, 2f, -18f, 12f, 10f, 4f, 0xFFF1EFEA, 0xFF2B2B29),
        ColorFilterPreset("pt-03", "PT-03", "Alabaster Flash", PhotoCategory.PORTRAIT, "Direct editorial studio strobe feel: crisp skin, pale chalk whites.", false, 4f, 18f, -2f, -20f, 6f, 14f, 16f, 0xFFF3EFE9, 0xFF232426),
        ColorFilterPreset("pt-04", "PT-04", "Atelier Shadow", PhotoCategory.PORTRAIT, "Directional fashion portrait look with deep sculptural wool shadows.", false, -3f, 20f, 2f, -22f, 6f, 18f, 22f, 0xFFDDD5C9, 0xFF242321),
        ColorFilterPreset("pt-05", "PT-05", "Velvet Portrait", PhotoCategory.PORTRAIT, "Intimate warm taupe shadow roll-off inspired by medium-format portraits.", false, -4f, 16f, 14f, -24f, 10f, 22f, 28f, 0xFFE3D0BA, 0xFF2A211A),
        ColorFilterPreset("pt-06", "PT-06", "Umber Skin", PhotoCategory.PORTRAIT, "Warm bronze and raw umber palette flattering golden hour portraits.", false, -1f, 14f, 18f, -14f, 8f, 18f, 20f, 0xFFDFBF9F, 0xFF2E2219),
        ColorFilterPreset("pt-07", "PT-07", "Platinum Matte", PhotoCategory.PORTRAIT, "Rare platinum-palladium portrait toning: near-monochrome warm silver.", true, 2f, 12f, 10f, -62f, 16f, 16f, 18f, 0xFFEAE1D2, 0xFF2E2A25),
        // 05 · Architecture
        ColorFilterPreset("ar-01", "AR-01", "Travertine", PhotoCategory.ARCHITECTURE, "Sun-washed Roman stone warmth with crisp structural clarity.", false, 3f, 12f, 14f, -16f, 8f, 12f, 8f, 0xFFDFD2BD, 0xFF2B2723),
        ColorFilterPreset("ar-02", "AR-02", "Gallery White", PhotoCategory.ARCHITECTURE, "Minimalist museum plaster daylight with ultra-clean neutral grays.", false, 5f, 8f, -4f, -30f, 10f, 8f, 4f, 0xFFF2F0EC, 0xFF2E2E2C),
        ColorFilterPreset("ar-03", "AR-03", "Pumice Daylight", PhotoCategory.ARCHITECTURE, "Dry mineral stone midtones with gentle chalky matte shadow lift.", false, 2f, 6f, 4f, -36f, 18f, 16f, 10f, 0xFFE4DFD6, 0xFF363531),
        ColorFilterPreset("ar-04", "AR-04", "Brutalist Stone", PhotoCategory.ARCHITECTURE, "Raw poured concrete with assertive shadow edges and low chroma.", false, -3f, 24f, -8f, -46f, 4f, 20f, 20f, 0xFFD4D6D4, 0xFF222423),
        ColorFilterPreset("ar-05", "AR-05", "Shadow Vault", PhotoCategory.ARCHITECTURE, "Dramatic afternoon geometry carved into deep charcoal ink.", false, -5f, 30f, 2f, -36f, 4f, 18f, 28f, 0xFFDCD6CB, 0xFF1B1A19),
        ColorFilterPreset("ar-06", "AR-06", "Concrete 1600", PhotoCategory.ARCHITECTURE, "Push-processed architectural film with tactile grain & cool steel grays.", false, -2f, 22f, -12f, -42f, 10f, 36f, 22f, 0xFFCED4D8, 0xFF23282D),
        ColorFilterPreset("ar-07", "AR-07", "Swiss Bleach", PhotoCategory.ARCHITECTURE, "Rare architectural monograph bleach-bypass: silver highlights, crisp ink.", true, 1f, 28f, -4f, -58f, 6f, 16f, 18f, 0xFFEAE8E2, 0xFF202224),
        // 06 · Street
        ColorFilterPreset("st-01", "ST-01", "Daylight 400", PhotoCategory.STREET, "Honest 35mm documentary color with crisp daylight micro-contrast.", false, 2f, 16f, 4f, -10f, 6f, 20f, 12f, 0xFFEAE4DA, 0xFF26292B),
        ColorFilterPreset("st-02", "ST-02", "Sunbleached", PhotoCategory.STREET, "Faded late-summer pavement with warm nostalgic 1990s film lift.", false, 5f, 0f, 16f, -18f, 22f, 18f, 10f, 0xFFE6D6BC, 0xFF36312A),
        ColorFilterPreset("st-03", "ST-03", "Chrome 200", PhotoCategory.STREET, "Slide-film punch with disciplined saturation and deep metallic shadows.", false, 0f, 24f, 4f, 4f, 2f, 16f, 18f, 0xFFE8DFD2, 0xFF1E252B),
        ColorFilterPreset("st-04", "ST-04", "Asphalt 800", PhotoCategory.STREET, "Gritty overcast street texture with cool slate shadows and 800 grain.", false, -3f, 22f, -10f, -30f, 8f, 34f, 24f, 0xFFCCD2D6, 0xFF252B30),
        ColorFilterPreset("st-05", "ST-05", "Rain Transit", PhotoCategory.STREET, "Wet pavement reflections and moody European commuter stillness.", false, -4f, 20f, -14f, -24f, 8f, 24f, 26f, 0xFFC9D5D8, 0xFF1D282E),
        ColorFilterPreset("st-06", "ST-06", "Wet Graphite", PhotoCategory.STREET, "Near-monochrome urban charcoal keeping subtle hints of rust & ochre.", false, -3f, 26f, -4f, -46f, 6f, 28f, 24f, 0xFFD6D4CF, 0xFF1F2124),
        ColorFilterPreset("st-07", "ST-07", "Tokyo Fluorescent", PhotoCategory.STREET, "Rare cinema jade-green station light with crisp cool highlights.", true, -1f, 18f, -10f, -18f, 10f, 26f, 20f, 0xFFD3E3D8, 0xFF1B2D29),
        // 07 · Still Life
        ColorFilterPreset("sl-01", "SL-01", "Raw Linen", PhotoCategory.STILL_LIFE, "Soft woven-paper tabletop light with calm neutral highlights.", false, 4f, 6f, 8f, -22f, 12f, 10f, 6f, 0xFFECE6DA, 0xFF2F2D29),
        ColorFilterPreset("sl-02", "SL-02", "Ceramist", PhotoCategory.STILL_LIFE, "Unglazed clay and limestone warmth crafted for handmade objects.", false, 2f, 12f, 18f, -12f, 8f, 14f, 12f, 0xFFD8BEA2, 0xFF2E261F),
        ColorFilterPreset("sl-03", "SL-03", "Bone Porcelain", PhotoCategory.STILL_LIFE, "Delicate translucent whites and pale taupe shadow transitions.", false, 6f, 2f, 4f, -28f, 16f, 8f, 4f, 0xFFF3EFE8, 0xFF373531),
        ColorFilterPreset("sl-04", "SL-04", "Cabinet Dark", PhotoCategory.STILL_LIFE, "Museum vitrine stillness anchored in velvet obsidian shadows.", false, -5f, 24f, 6f, -26f, 6f, 20f, 32f, 0xFFD8CEBE, 0xFF1E1B18),
        ColorFilterPreset("sl-05", "SL-05", "Archive 1978", PhotoCategory.STILL_LIFE, "Aged art-book monograph print with warm matte paper patina.", false, -1f, 12f, 18f, -34f, 20f, 28f, 22f, 0xFFDECBA9, 0xFF362D24),
        ColorFilterPreset("sl-06", "SL-06", "Oxidized Bronze", PhotoCategory.STILL_LIFE, "Muted antique patina pairing olive-verdigris shadows with warm brass.", false, -3f, 18f, 10f, -30f, 10f, 20f, 24f, 0xFFCBB28D, 0xFF262F28),
        ColorFilterPreset("sl-07", "SL-07", "Flemish Light", PhotoCategory.STILL_LIFE, "Rare old-master chiaroscuro: painterly golden sheen & deep umber.", true, -5f, 28f, 16f, -22f, 6f, 18f, 36f, 0xFFDEC192, 0xFF1E1A16),
        // 08 · Food & Coffee
        ColorFilterPreset("fc-01", "FC-01", "Morning Pastry", PhotoCategory.FOOD_COFFEE, "Sunlit bakery table with creamy highlights and golden espresso crema.", false, 5f, 10f, 14f, -4f, 8f, 8f, 6f, 0xFFEFE0CD, 0xFF302720),
        ColorFilterPreset("fc-02", "FC-02", "Matcha Table", PhotoCategory.FOOD_COFFEE, "Crisp culinary daylight keeping botanical greens fresh and clean.", false, 4f, 8f, 2f, -6f, 10f, 8f, 4f, 0xFFE9EFE7, 0xFF272E28),
        ColorFilterPreset("fc-03", "FC-03", "Kyoto Hinoki", PhotoCategory.FOOD_COFFEE, "Quiet Japanese cypress wood warmth with ultra-clean matte shadows.", false, 3f, 6f, 12f, -20f, 14f, 12f, 8f, 0xFFE8DEC9, 0xFF312C26),
        ColorFilterPreset("fc-04", "FC-04", "Espresso Roast", PhotoCategory.FOOD_COFFEE, "Dark timber coffee bar mood with deep velvety crema contrast.", false, -4f, 22f, 18f, -16f, 6f, 18f, 28f, 0xFFD6B898, 0xFF261C14),
        ColorFilterPreset("fc-05", "FC-05", "Bistro Candle", PhotoCategory.FOOD_COFFEE, "Intimate wine-bar amber glow paired with warm mahogany shadows.", false, -5f, 18f, 24f, -12f, 10f, 22f, 32f, 0xFFE2BA8A, 0xFF291D14),
        ColorFilterPreset("fc-06", "FC-06", "Burnt Umber", PhotoCategory.FOOD_COFFEE, "Rich roasted cocoa & ceramic tones with restrained highlight gloss.", false, -3f, 20f, 16f, -26f, 8f, 20f, 24f, 0xFFCDB59B, 0xFF2B2018),
        ColorFilterPreset("fc-07", "FC-07", "Cardamom Cream", PhotoCategory.FOOD_COFFEE, "Rare Scandinavian cafe magazine look: spiced ivory & soft olive clay.", true, 3f, 8f, 14f, -24f, 16f, 14f, 12f, 0xFFEFE4CE, 0xFF323028),
        // 09 · Night
        ColorFilterPreset("ng-01", "NG-01", "Blue Hour", PhotoCategory.NIGHT, "Crisp evening cobalt sky balancing cool mist and warm cafe windows.", false, 2f, 14f, -16f, -10f, 10f, 18f, 16f, 0xFFBFD2E0, 0xFF192634),
        ColorFilterPreset("ng-02", "NG-02", "Neon Soft", PhotoCategory.NIGHT, "Open nocturnal shadow detail letting urban glow breathe smoothly.", false, 2f, 10f, 2f, -8f, 16f, 22f, 18f, 0xFFDDD5E4, 0xFF25232E),
        ColorFilterPreset("ng-03", "NG-03", "Vapor Mist", PhotoCategory.NIGHT, "Hazy midnight fog diffusing streetlamps into quiet silver-violet.", false, 1f, 8f, -10f, -26f, 20f, 24f, 20f, 0xFFCFD5DC, 0xFF262B33),
        ColorFilterPreset("ng-04", "NG-04", "Tungsten 800", PhotoCategory.NIGHT, "Cinema 800T character: cool petrol shadows against amber streetlamps.", false, -3f, 22f, -14f, -8f, 6f, 28f, 26f, 0xFFE5C39C, 0xFF172C36),
        ColorFilterPreset("ng-05", "NG-05", "Midnight Ink", PhotoCategory.NIGHT, "Deep nocturnal stillness with crisp high-contrast darkroom blacks.", false, -6f, 28f, -8f, -26f, 4f, 28f, 36f, 0xFFD4D6DA, 0xFF15181F),
        ColorFilterPreset("ng-06", "NG-06", "Velvet Mercury", PhotoCategory.NIGHT, "Cool mercury-vapor street glow with subdued slate shadows.", false, -3f, 20f, -12f, -22f, 8f, 26f, 28f, 0xFFC5DCD4, 0xFF1A2628),
        ColorFilterPreset("ng-07", "NG-07", "Sodium Dusk", PhotoCategory.NIGHT, "Rare amber sodium-lamp highlights counterbalanced by plum-indigo shadows.", true, -2f, 20f, 8f, -14f, 10f, 26f, 28f, 0xFFE8B87D, 0xFF261E30),
        // 10 · Monochrome
        ColorFilterPreset("mo-01", "MO-01", "Chalk Matte", PhotoCategory.MONOCHROME, "Paper-soft fine art grayscale with lifted charcoal shadows.", false, 4f, 0f, 4f, -100f, 22f, 14f, 10f, null, 0xFF363430, true),
        ColorFilterPreset("mo-02", "MO-02", "Silver Daylight", PhotoCategory.MONOCHROME, "Luminous archival monochrome with clean, open midtone separation.", false, 3f, 16f, 0f, -100f, 8f, 16f, 12f, 0xFFEFECE6, null, true),
        ColorFilterPreset("mo-03", "MO-03", "Platinum Paper", PhotoCategory.MONOCHROME, "Warm cotton-rag fiber print with velvety cream highlights.", false, 2f, 12f, 12f, -100f, 14f, 16f, 14f, 0xFFEAE0CE, 0xFF2E2822, true),
        ColorFilterPreset("mo-04", "MO-04", "Silver Gelatin", PhotoCategory.MONOCHROME, "Classic darkroom fiber print: deep ink blacks & luminous highlights.", false, -2f, 28f, 0f, -100f, 4f, 22f, 20f, null, null, true),
        ColorFilterPreset("mo-05", "MO-05", "Tri-X Noir", PhotoCategory.MONOCHROME, "Gritty high-acutance 35mm street monochrome with expressive grain.", false, -4f, 38f, 0f, -100f, 0f, 42f, 28f, null, null, true),
        ColorFilterPreset("mo-06", "MO-06", "Carbon Ink", PhotoCategory.MONOCHROME, "Rich carbon-pigment density with dramatic low-key tonal compression.", false, -6f, 34f, 0f, -100f, 2f, 26f, 34f, null, 0xFF171717, true),
        ColorFilterPreset("mo-07", "MO-07", "Selenium Print", PhotoCategory.MONOCHROME, "Rare exhibition selenium toning: metallic cool-slate shadow sheen.", true, 0f, 26f, -10f, -100f, 6f, 20f, 22f, 0xFFE9ECEE, 0xFF252B36, true),
        // 11 · Self-Portrait
        ColorFilterPreset("sp-01", "SP-01", "Soft Dew", PhotoCategory.SELF_PORTRAIT, "Luminous bare-skin hydration with gentle Pro-Mist highlight bloom and calm neutral whites.", false, 5f, -2f, 4f, -8f, 6f, 8f, 6f, 0xFFFFF6EE, 0xFF362E2B),
        ColorFilterPreset("sp-02", "SP-02", "Rose Quartz", PhotoCategory.SELF_PORTRAIT, "Delicate rosy-peach cheek warmth crafted for sunlit bedroom windows and golden indoor bounce.", false, 4f, 2f, 10f, -6f, 8f, 10f, 10f, 0xFFFCE8E2, 0xFF3A2A2D),
        ColorFilterPreset("sp-03", "SP-03", "Mirror Flash", PhotoCategory.SELF_PORTRAIT, "Editorial pocket-camera direct flash: crisp skin separation, specular pop, and cool room shadows.", false, 3f, 20f, -4f, -10f, 4f, 20f, 26f, 0xFFF7F5F2, 0xFF22272F),
        ColorFilterPreset("sp-04", "SP-04", "Glass Skin", PhotoCategory.SELF_PORTRAIT, "Clean Seoul beauty-editorial finish: translucent cool-porcelain highlights that calm indoor yellow cast.", false, 6f, 4f, -10f, -14f, 4f, 6f, 4f, 0xFFF2F6FA, 0xFF2D333C),
        ColorFilterPreset("sp-05", "SP-05", "Sun Kissed", PhotoCategory.SELF_PORTRAIT, "Late-afternoon golden glow with protected natural complexion so warm light never turns skin orange.", false, 3f, 8f, 18f, -4f, 6f, 12f, 14f, 0xFFF9E4C4, 0xFF352820),
        ColorFilterPreset("sp-06", "SP-06", "Velvet Matte", PhotoCategory.SELF_PORTRAIT, "Soft-focus matte highlight roll-off that tames oily shine and leaves velvety studio-taupe shadows.", false, 1f, -2f, 4f, -22f, 14f, 16f, 18f, 0xFFEDE5DA, 0xFF38312B),
        ColorFilterPreset("sp-07", "SP-07", "2000s Digicam", PhotoCategory.SELF_PORTRAIT, "Nostalgic early-2000s CCD pocket digicam charm: soft optical glow, cyan-jade shadow cast & gentle lens fringe.", true, 3f, 12f, -6f, 6f, 10f, 28f, 20f, 0xFFF8F2DF, 0xFF24383B),
        // 12 · Icons 25
        ColorFilterPreset("ic-01", "IC-01", "Classic Chrome", PhotoCategory.ICONS_25, "Muted documentary slide simulation: desaturated teal skies, restrained reds, and crisp hard shadow transitions.", false, -1f, 18f, 4f, -20f, 6f, 16f, 14f, 0xFFECE6DA, 0xFF232C30),
        ColorFilterPreset("ic-02", "IC-02", "Classic Neg", PhotoCategory.ICONS_25, "Expressive Japanese street negative simulation: deep emerald greens, crimson-rust reds, and warm highlight roll-off.", false, -2f, 24f, 6f, -6f, 6f, 24f, 18f, 0xFFF3E4CE, 0xFF1C2D2B),
        ColorFilterPreset("ic-03", "IC-03", "Velvia Vivid", PhotoCategory.ICONS_25, "High-impact 50-ISO reversal slide vibrancy: luminous forest emerald, rich cobalt skies, and dramatic sunset magenta.", false, -2f, 28f, 4f, 26f, 0f, 10f, 16f, 0xFFFBECE2, 0xFF1D1E32),
        ColorFilterPreset("ic-04", "IC-04", "Leica M Natural", PhotoCategory.ICONS_25, "Rangefinder optical micro-contrast: three-dimensional midtone pop, sculptural deep shadows, and honest European color.", false, -2f, 22f, -2f, -8f, 2f, 10f, 22f, 0xFFF3F0EA, 0xFF1C2026),
        ColorFilterPreset("ic-05", "IC-05", "Leica Brass", PhotoCategory.ICONS_25, "Fixed-lens 28mm cinema rendering: toasted brass highlights, deep olive foliage, and velvet obsidian blacks.", false, -3f, 26f, 12f, -16f, 4f, 14f, 28f, 0xFFEBCCA0, 0xFF1F2520),
        ColorFilterPreset("ic-06", "IC-06", "Medium Natural", PhotoCategory.ICONS_25, "Swedish medium-format natural color science: silky 16-bit highlight roll-off, pure azure skies, and true-to-life skin.", false, 3f, 10f, 3f, -4f, 2f, 4f, 8f, 0xFFF6F2EA, 0xFF26282C),
        ColorFilterPreset("ic-07", "IC-07", "GR Positive", PhotoCategory.ICONS_25, "Compact 28mm Tokyo street Positive Film: punchy asphalt contrast, deep sapphire blues, and unmistakable edge grit.", false, -3f, 30f, -4f, 6f, 2f, 26f, 30f, 0xFFECE9E2, 0xFF19242C),
        ColorFilterPreset("ic-08", "IC-08", "GR Hi-Contrast B&W", PhotoCategory.ICONS_25, "Iconic street snapshot high-contrast monochrome: bold ink-black shadows, electric white highlights, and gritty grain.", false, -3f, 44f, 0f, -100f, 2f, 54f, 36f, null, null, true),
        ColorFilterPreset("ic-09", "IC-09", "Portra 400", PhotoCategory.ICONS_25, "Beloved daylight portrait negative: luminous golden-peach skin, airy creamy highlights, and fine organic grain.", false, 5f, 4f, 12f, -8f, 8f, 20f, 8f, 0xFFF7EBD8, 0xFF312D28),
        ColorFilterPreset("ic-10", "IC-10", "Portra 800", PhotoCategory.ICONS_25, "High-speed warm negative stock: richer sunset amber, glowing halation on bright edges, and expressive 800-ISO grain.", false, 2f, 14f, 16f, 8f, 6f, 38f, 16f, 0xFFF8DFBA, 0xFF2A2630),
        ColorFilterPreset("ic-11", "IC-11", "Gold 200", PhotoCategory.ICONS_25, "Sun-drenched nostalgic consumer 35mm: honey-gold highlights, cheerful warm yellows, and retro summer-holiday fade.", false, 3f, 12f, 22f, 6f, 10f, 30f, 16f, 0xFFF9E3B2, 0xFF352B20),
        ColorFilterPreset("ic-12", "IC-12", "Ektar 100", PhotoCategory.ICONS_25, "Ultra-fine grain landscape negative: vivid crimson reds, deep Mediterranean cobalt skies, and crisp high-acutance punch.", false, 0f, 24f, 4f, 22f, 2f, 8f, 14f, 0xFFF7EBE0, 0xFF1C2634),
        ColorFilterPreset("ic-13", "IC-13", "800T Halation", PhotoCategory.ICONS_25, "Tungsten-balanced motion picture stock with signature crimson-orange highlight halation and cool cyan-teal shadows.", true, -3f, 22f, -20f, 4f, 6f, 38f, 26f, 0xFFF5C898, 0xFF13303B),
        ColorFilterPreset("ic-14", "IC-14", "400D Daylight", PhotoCategory.ICONS_25, "Versatile daylight cinema film stock: warm amber-cream sunshine, subtle red-edge halation, and airy shadow detail.", false, 3f, 14f, 14f, 4f, 8f, 26f, 14f, 0xFFF8DFC2, 0xFF243034),
        ColorFilterPreset("ic-15", "IC-15", "Pro 400H Mint", PhotoCategory.ICONS_25, "Cult-classic pastel wedding & editorial film: airy luminous whites, soft mint-sage greens, and cool seafoam shadows.", false, 6f, -4f, -8f, -14f, 10f, 16f, 6f, 0xFFEDF4EF, 0xFF2B3B38),
        ColorFilterPreset("ic-16", "IC-16", "Superia 400", PhotoCategory.ICONS_25, "Classic drugstore 35mm everyday stock: unmistakable jade-green shadow tint, punchy magenta-reds, and lively grain.", false, 1f, 16f, -6f, 2f, 8f, 34f, 18f, 0xFFF3EDE0, 0xFF1C342B),
        ColorFilterPreset("ic-17", "IC-17", "HP5+ Silver", PhotoCategory.ICONS_25, "Timeless British 400-ISO documentary monochrome: wide forgiving midtone latitude, soft lifted blacks, and classic silver grain.", false, 2f, 14f, 0f, -100f, 12f, 44f, 14f, 0xFFF0EDE7, 0xFF2C2C2B, true),
        ColorFilterPreset("ic-18", "IC-18", "Tri-X Press", PhotoCategory.ICONS_25, "Legendary photojournalist 400-ISO black & white: crisp acutance, deep ink-black shadows, and tactile darkroom grit.", false, -2f, 38f, 0f, -100f, 4f, 62f, 28f, null, null, true),
        ColorFilterPreset("ic-19", "IC-19", "A6 Minimal", PhotoCategory.ICONS_25, "Ultra-clean analog minimalism: creamy off-white highlights, subtle warm skin lift, and restrained studio contrast.", false, 4f, 8f, 6f, -22f, 12f, 14f, 8f, 0xFFF3EDE2, 0xFF322F2C),
        ColorFilterPreset("ic-20", "IC-20", "M5 Vintage Fade", PhotoCategory.ICONS_25, "Nostalgic muted mood filter: dusty espresso shadows, low-chroma earth tones, and soft 1970s print fade.", false, -2f, 4f, 14f, -32f, 20f, 24f, 24f, 0xFFE7D9C2, 0xFF3A2E25),
        ColorFilterPreset("ic-21", "IC-21", "HB2 Cool Slate", PhotoCategory.ICONS_25, "Modern Scandinavian editorial cool tone: crisp mineral slate shadows, clean icy whites, and urban calm.", false, 1f, 18f, -16f, -22f, 6f, 14f, 16f, 0xFFEBF1F6, 0xFF1F2B36),
        ColorFilterPreset("ic-22", "IC-22", "CPM35 Pocket", PhotoCategory.ICONS_25, "Beloved 35mm compact point-and-shoot look: warm golden highlight glow, soft optical bloom, and casual nostalgic grain.", false, 3f, 14f, 16f, -4f, 10f, 32f, 22f, 0xFFF9E7C4, 0xFF25312D),
        ColorFilterPreset("ic-23", "IC-23", "FXN-R Classic", PhotoCategory.ICONS_25, "Atmospheric retro negative film cam: muted botanical jade-teal shadows, creamy matte highlights, and quiet nostalgic romance.", false, 1f, 12f, -4f, -16f, 14f, 28f, 20f, 0xFFEFE8D8, 0xFF1E3330),
        ColorFilterPreset("ic-24", "IC-24", "Teal & Amber", PhotoCategory.ICONS_25, "Modern theatrical widescreen color grade: deep petrol-teal shadows juxtaposed against glowing amber highlights.", false, -2f, 26f, 4f, 2f, 4f, 18f, 26f, 0xFFF7C88B, 0xFF12333D),
        ColorFilterPreset("ic-25", "IC-25", "SX-70 Instant", PhotoCategory.ICONS_25, "Classic integral instant-film chemistry: dreamy creamy fade, vintage amber-magenta midtones, and hazy cyan shadows.", true, 4f, -2f, 14f, -20f, 22f, 34f, 28f, 0xFFF7EAD0, 0xFF2A3C3F)
    )

    fun forCategory(category: PhotoCategory): List<ColorFilterPreset> =
        all.filter { it.category == category }
}
