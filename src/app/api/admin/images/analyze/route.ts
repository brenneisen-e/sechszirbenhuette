import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Category keywords for intelligent classification
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'exterior': ['außen', 'fassade', 'haus', 'hütte', 'gebäude', 'dach', 'balkon', 'terrasse', 'eingang', 'outside', 'exterior', 'building', 'house', 'cabin', 'chalet'],
  'living': ['wohnzimmer', 'wohnbereich', 'sofa', 'couch', 'kamin', 'ofen', 'fernseher', 'living', 'lounge', 'fireplace'],
  'kitchen': ['küche', 'kochen', 'herd', 'ofen', 'spüle', 'kühlschrank', 'esstisch', 'kitchen', 'cooking', 'dining'],
  'bedrooms': ['schlafzimmer', 'bett', 'betten', 'schlafen', 'bedroom', 'bed', 'sleeping'],
  'bathroom': ['bad', 'badezimmer', 'dusche', 'sauna', 'wellness', 'bathroom', 'shower', 'bath'],
  'surroundings': ['landschaft', 'berge', 'alpen', 'natur', 'wald', 'wiese', 'panorama', 'aussicht', 'mountains', 'landscape', 'nature', 'view', 'alps'],
  'summer': ['sommer', 'wandern', 'grün', 'blumen', 'summer', 'hiking', 'green'],
  'winter': ['winter', 'schnee', 'ski', 'snow', 'skiing', 'weiß'],
};

// POST - Analyze image with AI and suggest description + category
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.AI) {
      return NextResponse.json({
        error: 'AI binding not configured',
        suggestion: 'Bild der Sechszirbenhütte',
        category: 'exterior'
      }, { status: 200 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to array buffer for AI
    const imageBuffer = await file.arrayBuffer();
    const imageArray = new Uint8Array(imageBuffer);

    // Use Cloudflare AI vision model to analyze the image
    const response = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: [...imageArray],
      prompt: `Beschreibe dieses Bild in einem kurzen deutschen Satz (maximal 10 Wörter). Das Bild zeigt wahrscheinlich eine Berghütte, Landschaft, Innenraum oder Aktivitäten in den Alpen. Gib auch an, ob es sich um einen Außenbereich, Wohnzimmer, Küche, Schlafzimmer, Bad/Sauna, Landschaft oder sonstiges handelt. Antworte nur mit der Beschreibung, ohne Einleitung.`,
      max_tokens: 100
    });

    // Extract the description from the response
    let suggestion = 'Bild der Sechszirbenhütte';

    if (response && typeof response === 'object' && 'description' in response) {
      suggestion = (response as { description: string }).description;
    } else if (response && typeof response === 'object' && 'response' in response) {
      suggestion = (response as { response: string }).response;
    } else if (typeof response === 'string') {
      suggestion = response;
    }

    // Clean up the suggestion
    suggestion = suggestion
      .replace(/^(Das Bild zeigt|Dieses Bild zeigt|Auf dem Bild ist|Auf dem Bild sieht man)\s*/i, '')
      .replace(/\.$/, '')
      .trim();

    // Capitalize first letter
    if (suggestion.length > 0) {
      suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
    }

    // Determine category from description and filename
    const textToAnalyze = (suggestion + ' ' + file.name).toLowerCase();
    let detectedCategory = 'exterior'; // Default to exterior (good for hero)
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matches = keywords.filter(kw => textToAnalyze.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }

    // Determine if image should be in hero slider
    // Hero candidates: exterior shots, landscape shots with good views
    const isHeroCandidate = ['exterior', 'surroundings'].includes(detectedCategory) ||
      textToAnalyze.includes('hütte') ||
      textToAnalyze.includes('panorama') ||
      textToAnalyze.includes('aussicht');

    return NextResponse.json({
      suggestion,
      category: detectedCategory,
      isHeroCandidate
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return a default suggestion on error
    return NextResponse.json({
      suggestion: 'Bild der Sechszirbenhütte',
      category: 'exterior',
      isHeroCandidate: true,
      error: error instanceof Error ? error.message : 'AI analysis failed'
    });
  }
}
