import type { StyleGuideGenerateResponse } from "../api/styleGuideGenerate";

export const DEMO_STYLE_GUIDE_FILENAME = "ASICS-Tone-of-Voice-Source.txt";

export const DEMO_STYLE_GUIDE_SOURCE = `ASICS Brand Writing — Tone of Voice Source (Demo)
================================================

Purpose
-------
This document defines how ASICS speaks in product, e-commerce, and campaign copy.
Use it to keep generated content on-brand, accurate, and consistent across markets.

Voice principles
----------------
1. Performance-led — lead with what the product helps the athlete achieve.
2. Accessible — explain technology in plain language; avoid jargon unless writing for experts.
3. Confident, not boastful — state benefits supported by specs; never over-promise results.
4. Human — write like a knowledgeable coach, not a spec sheet or ad cliché.

Tone by channel
---------------
- Product descriptions: energetic, factual, scannable (short paragraphs + feature bullets).
- Email / CRM: warmer, direct, one clear call to action per message.
- Marketplace listings: concise; front-load the product name and primary benefit.

Terminology
-----------
- Use trademark symbols on first mention: GEL™, FF BLAST™, AHAR™, LITETRUSS™.
- Prefer "runners" or "athletes" over "users" in performance copy.
- Use "daily trainer", "race day", "overpronation" correctly — do not invent gait claims.

Formatting
----------
- Sentence case for headings in body copy.
- Oxford comma for EN-US.
- Feature bullets: 4–6 items max; start with a strong noun or verb.
- Length: medium product descriptions target 100–300 words unless template says otherwise.

Restrictions
------------
- Do not guarantee injury prevention, medical outcomes, or race times.
- Do not name competitors unless legal/comms has approved comparison copy.
- Do not invent SKU specs, weights, drops, or materials not in the product brief.
- When a fact is missing, flag it — do not guess.

Sample product line (reference)
-------------------------------
"Meet the GEL-Nimbus 27 — balanced cushioning for everyday miles. FF BLAST™ PLUS ECO
returns energy step after step, while the engineered mesh upper keeps the fit light
and adaptive."
`;

export function createDemoStyleGuideFile(): File {
  return new File([DEMO_STYLE_GUIDE_SOURCE], DEMO_STYLE_GUIDE_FILENAME, {
    type: "text/plain",
  });
}

export function buildDemoStyleGuideOutput(
  fileName: string,
  fileContent: string,
): StyleGuideGenerateResponse {
  const excerpt = fileContent.trim().slice(0, 160) || DEMO_STYLE_GUIDE_SOURCE.slice(0, 160);
  const titleBase = fileName.replace(/\.[^.]+$/, "").trim() || "Brand Voice Style Guide";

  return {
    name: titleBase.startsWith("Demo") ? titleBase : `Demo — ${titleBase}`,
    content: `# ${titleBase} — LLM style guide (demo)

## Voice
- Performance-led, accessible, and human — write like a knowledgeable coach
- Confident without hype; cite benefits backed by product facts
- Prefer active voice and short sentences (~20 words or fewer where possible)

## Tone by channel
- **Product copy:** energetic, factual, scannable (short paragraphs + bullets)
- **Email / CRM:** warmer and direct; one clear call to action
- **Marketplace:** concise; product name and primary benefit first

## Terminology
- Use ™ on first mention for approved technologies (GEL™, FF BLAST™, AHAR™, LITETRUSS™)
- Say "runners" or "athletes" instead of "users" in performance contexts
- Use correct running terms (daily trainer, race day, overpronation) — do not invent gait claims

## Formatting
- Sentence case for headings in body copy
- Oxford comma for EN-US
- Feature bullets: 4–6 items; start with a strong noun or verb
- Default length: 100–300 words for medium product descriptions unless specified

## Restrictions
- No guaranteed performance, medical, or injury-prevention claims
- No competitor names unless explicitly approved
- No invented specs (weight, drop, materials) — flag missing facts instead of guessing

## Example on-brand line
> Meet the GEL-Nimbus 27 — balanced cushioning for everyday miles. FF BLAST™ PLUS ECO returns energy step after step, while the engineered mesh upper keeps the fit light and adaptive.

---
*Demo generation · compressed from ${fileName}*
*Source excerpt: ${excerpt}${fileContent.length > 160 ? "…" : ""}*

*Configure an OpenAI or Vercel AI Gateway key under Admin → System for live LLM analysis of uploaded documents.*`,
    model: "demo",
  };
}

export const DEMO_GENERATION_DELAY_MS = 1400;
