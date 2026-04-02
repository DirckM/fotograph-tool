import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TEST_PROJECTS = [
  {
    name: "SS26 Lookbook — Maison Rivière",
    description:
      "Full lookbook shoot for Maison Rivière's Spring/Summer 2026 collection. 40 looks across womenswear and accessories. Studio and outdoor locations, editorial feel with a focus on draping and movement.",
    employer_name: "Maison Rivière",
    employer_notes:
      "Brand is repositioning towards a younger demographic (25-35). They want a warm, sun-drenched color palette — no cool tones. All garments must be shown on-model, no flat lays. Creative director insists on natural hair and minimal retouching. Deliverables: 3 hero images per look + full-length and detail crops. Deadline is April 18.",
    context_text:
      "Maison Rivière SS26 Lookbook\n\nClient: Maison Rivière (French contemporary womenswear)\nContact: Camille Renard, Creative Director — camille@maisonriviere.fr\n\nBrief:\nThe SS26 collection is titled \"Lumière Dorée\" and draws from the south of France — lavender fields, terracotta villages, golden-hour light. The brand is pivoting from their traditional 35-50 demographic towards 25-35 while keeping their signature fluid silhouettes and natural fabrics.\n\n40 looks total: 28 womenswear, 8 accessories, 4 shoes.\n\nCreative Direction:\n- Warm, sun-drenched tones throughout. No cool blues or grays.\n- Natural hair, minimal makeup — \"she just came back from a walk through the market\"\n- Mix of studio (clean, warm-toned backdrop) and outdoor (golden hour, countryside estate)\n- Movement is key — fabrics should flow, not pose static\n- Reference photographers: Lachlan Bailey, Angelo Pennetta\n\nModel Requirements:\n- 2 models, diverse casting, sizes 36-40 EU\n- Natural look, minimal styling\n\nDeliverables per look:\n- 3 hero images (editorial composition)\n- 1 full-length clean shot\n- 2 detail crops (fabric texture, hardware, stitching)\n\nTimeline:\n- Shoot dates: April 7-9 (3 days)\n- First selects to client: April 12\n- Final retouched files: April 18\n- Usage: lookbook (print + digital), brand website, wholesale presentations",
  },
  {
    name: "Nike ACG Product Flats — Q3 Drop",
    description:
      "Product photography for Nike ACG's Q3 2026 footwear and outerwear drop. Clean ghost mannequin and packshot style for e-commerce, plus a few styled editorial frames for social.",
    employer_name: "Nike Europe (via Dept Agency)",
    employer_notes:
      "Strict brand guidelines — use Nike's provided backdrop hex (#F5F5F5). Each SKU needs front, back, side, 45-degree, and detail shots. Footwear on a 15-degree riser. They'll supply the garments via courier on March 30. Ghost mannequin shots need invisible mannequin retouching. No creative liberties on e-comm shots, but the 4 editorial frames can be more expressive. Final files: PNG on transparent bg, 3000x3000px minimum.",
    context_text:
      "Nike ACG Q3 2026 — Product Photography Brief\n\nClient: Nike Europe, managed via Dept Agency Amsterdam\nContact: Sander Vos (Dept) — sander.vos@deptagency.com\nBrand contact: Priya Mehta (Nike EMEA) — pmehta@nike.com\n\nProject Scope:\nE-commerce product photography for Nike ACG (All Conditions Gear) Q3 2026 drop. 18 SKUs total:\n- 6 footwear styles (trail runners, hiking boots, sandals)\n- 8 outerwear pieces (shells, vests, windbreakers)\n- 4 accessories (caps, bags)\n\nE-Commerce Shots (per SKU):\n- Front, back, side (left), 45-degree angle, detail close-up\n- Background: #F5F5F5 (Nike brand standard)\n- Footwear: positioned on 15-degree riser, laces styled per Nike guide\n- Apparel: ghost mannequin (invisible mannequin retouching in post)\n- Final: PNG, transparent background, 3000x3000px, sRGB\n- Naming: [SKU]_[angle]_[sequence].png\n\nEditorial Frames (4 total):\n- Styled outdoor/adventure context shots for social media\n- More creative freedom — moody, nature-forward, \"trail-ready\"\n- Deliverable: 3 crops per frame (1:1, 4:5, 16:9)\n\nTechnical Requirements:\n- All files must pass Nike's automated QC tool (details in brand guide PDF)\n- Color accuracy is critical — shoot with X-Rite ColorChecker\n- No color grading on e-comm shots\n\nLogistics:\n- Garments arrive via DHL on March 30\n- Shoot window: March 31 - April 2\n- All garments must be returned to Nike warehouse by April 5\n- First pass delivery: April 4\n- Final delivery (after Nike QC feedback): April 8",
  },
  {
    name: "Atelier Bloem — Bridal Campaign",
    description:
      "Campaign shoot for Dutch bridal brand Atelier Bloem's 2026 collection. 12 gowns, romantic and modern editorial style. One studio day + one golden-hour outdoor session at a heritage estate.",
    employer_name: "Atelier Bloem",
    employer_notes:
      "The designer will be on-set and wants to approve lighting setups before each look. Model must be size 36-38 EU and at least 175cm. They want a soft, film-like grain in post — reference: early Peter Lindbergh. No heavy skin smoothing. Bouquets and accessories will be provided by a partner florist. Need 2 vertical crops per look for Instagram Reels covers. Budget includes one makeup artist, hair is handled by the brand's own stylist.",
    context_text:
      "Atelier Bloem — 2026 Bridal Campaign\n\nClient: Atelier Bloem (Amsterdam-based bridal atelier)\nContact: Eva van der Berg, Founder & Designer — eva@atelierbloem.nl\n\nBrand Identity:\nAtelier Bloem makes modern, architectural bridal gowns with Dutch minimalism. Their clients are design-conscious brides (28-38) who want something elegant but not traditional. The brand is growing fast on Instagram and just secured stockists in London and Paris.\n\nCollection:\n12 gowns for the 2026 bridal season:\n- 4 structured/architectural pieces (sharp lines, sculptural bodices)\n- 4 romantic/flowing pieces (silk, chiffon, movement)\n- 2 minimalist (clean crepe, zero embellishment)\n- 2 statement pieces (dramatic trains, capes)\n\nCreative Direction:\n- Mood: \"quiet romance\" — intimate, not staged\n- Tone: soft, warm, slightly desaturated with fine film grain\n- Reference: early Peter Lindbergh, Paolo Roversi polaroids\n- Absolutely no heavy skin retouching — keep texture, freckles, natural skin\n- Bouquets and floral hairpieces provided by Bloomon (partner florist)\n\nModel:\n- 1 model, size 36-38 EU, minimum 175cm\n- Natural beauty, minimal makeup, loose/undone hair\n- Eva's stylist handles hair on-set\n\nLocations:\n- Day 1: Studio (Amsterdam) — clean, soft directional light, paper backdrop\n- Day 2: Heritage estate (Kasteel de Haar, Utrecht) — golden hour, gardens, stone interiors\n\nDeliverables per gown:\n- 2 hero editorial images\n- 1 full-length clean shot\n- 1 back/detail shot\n- 2 vertical crops (9:16) for Instagram Reels/Stories covers\n\nTimeline:\n- Shoot: April 14-15\n- Selects review with Eva: April 17\n- Final retouched: April 22\n- Campaign launches May 1",
  },
  {
    name: "Zalando Basics — Flat Lay Batch",
    description:
      "High-volume flat lay shoot for Zalando's private label basics line. 120 SKUs across t-shirts, hoodies, joggers, and underwear. Pure e-commerce, white background, consistent styling.",
    employer_name: "Zalando SE",
    employer_notes:
      "This is a volume job — they expect 60 SKUs per day across two shooting days. Each SKU gets one flat lay hero and one detail texture crop. Garments arrive pre-steamed. Follow the Zalando flat lay template (provided in shared Drive folder). Consistent fold lines on all t-shirts. All files named with Zalando SKU codes (they'll supply a CSV). RAW + processed JPEG delivery via their FTP. Payment net-30 after delivery sign-off.",
    context_text:
      "Zalando Basics — Flat Lay Product Photography\n\nClient: Zalando SE, Private Labels Division\nContact: Markus Hoffman, Visual Content Manager — markus.hoffman@zalando.de\n\nProject:\nHigh-volume flat lay photography for Zalando's in-house \"Basics\" line. This is a recurring production job — they do seasonal refreshes and this is the Spring/Summer 2026 batch.\n\n120 SKUs:\n- 40 t-shirts (crew neck, v-neck, oversized) in 5 colorways\n- 20 hoodies (pullover, zip) in 4 colorways\n- 30 joggers/sweatpants in 4 colorways\n- 30 underwear sets (briefs, boxers, bralettes) in assorted colors\n\nShot List (per SKU):\n1. Flat lay hero — folded/styled per Zalando template, white background\n2. Detail texture crop — fabric close-up showing weave/knit/print quality\n\nStyling Rules:\n- All t-shirts: identical fold (horizontal thirds, sleeves tucked)\n- Hoodies: hood laid flat, drawstrings even, zipper half-open on zip styles\n- Joggers: folded at knee, waistband visible\n- Underwear: laid flat, elastic band prominent\n- No props, no accessories, no background elements\n- Steam everything even if pre-steamed — zero wrinkles policy\n\nTechnical:\n- Background: pure white (#FFFFFF), lit separately\n- Camera: locked overhead rig, consistent height\n- Files: RAW (CR3) + processed JPEG (sRGB, 4000x5000px)\n- Naming convention: [Zalando_SKU]_[shot_type].jpg (CSV with codes provided)\n- Delivery: Zalando FTP (credentials in shared doc)\n\nSchedule:\n- Garments delivered April 1 (pre-steamed, bagged by SKU)\n- Shoot days: April 2-3 (target 60 SKUs/day)\n- Delivery: April 5 (all files uploaded to FTP)\n- Zalando QC review: April 5-7\n- Reshoot window (if needed): April 9\n- Payment: net-30 after sign-off",
  },
  {
    name: "Wanderlei Eyewear — Social Content Pack",
    description:
      "Lifestyle and product content for Wanderlei, a DTC eyewear startup. Mix of on-model lifestyle shots and clean product-on-surface compositions for their website relaunch and paid social campaigns.",
    employer_name: "Wanderlei Eyewear",
    employer_notes:
      "Early-stage brand, first professional shoot. They have 8 frame styles in 3 colorways each (24 SKUs total). Want a mix of studio product shots (marble surface, hard light, architectural shadows) and lifestyle shots with 2 models. Target audience is urban professionals 28-40. They love the Gentle Monster and Cubitts aesthetic. Provide 3 aspect ratios per lifestyle shot: 4:5 (feed), 9:16 (stories), 1.91:1 (ads). Budget is tight — one shoot day max. Founder will be on-set for creative direction.",
    context_text:
      "Wanderlei Eyewear — Website Relaunch + Social Content\n\nClient: Wanderlei Eyewear (DTC eyewear startup, Amsterdam)\nContact: Lucas Wanderlei, Founder — lucas@wanderlei.co\n\nBrand:\nWanderlei is a new DTC eyewear brand targeting urban professionals (28-40). Premium acetate frames, made in Italy, sold online only. They are relaunching their website and need a full content library. This is their first professional shoot — previously they used iPhone photos.\n\nAesthetic references: Gentle Monster (dramatic, architectural), Cubitts (clean, British minimalism), Ace & Tate campaign imagery.\n\nProduct Range:\n8 frame styles x 3 colorways = 24 SKUs\n- 4 optical frames (round, square, cat-eye, aviator)\n- 4 sunglasses (same shapes, tinted lenses)\n- Colorways: matte black, tortoise, translucent gray\n\nShot Types Needed:\n\n1. Product-on-surface (per SKU — 24 shots):\n   - Marble slab surface, hard directional light, sharp architectural shadows\n   - Frame 3/4 angle, arms slightly open\n   - Clean, minimal, no props\n\n2. Lifestyle editorial (8-10 final selects):\n   - 2 models (1M, 1F), diverse casting, urban-professional look\n   - Locations within studio: concrete wall, window light, plant shelf\n   - Candid/natural feel — \"wearing glasses while living life\"\n   - Each select delivered in 3 crops: 4:5 (IG feed), 9:16 (Stories/Reels), 1.91:1 (Meta ads)\n\n3. Detail/texture (6 shots):\n   - Hinge close-ups, acetate texture, lens reflections\n   - For website product detail sections\n\nTechnical:\n- Product shots: white/marble bg, high res for web (3000px long edge min)\n- Lifestyle: lightly graded, consistent warm tone, natural skin\n- Delivery: organized by type, named [style]_[color]_[shot_type]\n\nLogistics:\n- Budget: tight (startup) — one shoot day max\n- Lucas (founder) will be on-set for creative direction\n- Frames available for pickup at their Amsterdam showroom\n- Shoot date: April 5\n- First selects: April 7\n- Final delivery: April 10\n- Usage: website, Instagram, Meta ads, potential print for pop-up events",
  },
];

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  for (const { context_text, ...projectFields } of TEST_PROJECTS) {
    // Create the project with context_text filled and stage already at 1
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        ...projectFields,
        context_text,
        current_stage: 1,
      })
      .select()
      .single();

    if (error) {
      results.push({ name: projectFields.name, error: error.message });
      continue;
    }

    // Mark stage 0 (Context) as approved so the gate passes
    await supabase.from("project_stage_state").insert({
      project_id: project.id,
      stage: 0,
      state: { context_text },
      approved_at: new Date().toISOString(),
    });

    results.push({ name: project.name, id: project.id });
  }

  return NextResponse.json(
    {
      message: `Seeded ${results.filter((r) => !("error" in r)).length} test projects (context stage pre-approved)`,
      results,
    },
    { status: 201 }
  );
}
