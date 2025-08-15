"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRatingContext = exports.generateAIRecommendations = void 0;
const shared_1 = require("@cards-after-dark/shared");
// Fallback cards in case AI fails
const FALLBACK_CARDS = [
    {
        title: "Romantic Massage",
        description: "Give your partner a relaxing 10-minute massage with scented oils and soft music. Focus on their shoulders and back.",
        kinkFactor: 1,
        category: shared_1.CardCategory.ROMANCE,
        tags: ["massage", "romantic", "relaxing"]
    },
    {
        title: "Wine & Share",
        description: "Open a bottle of wine and take turns sharing three things you love about each other right now.",
        kinkFactor: 1,
        category: shared_1.CardCategory.DATE_NIGHT,
        tags: ["wine", "sharing", "appreciation"]
    },
    {
        title: "Dance in the Dark",
        description: "Turn off the lights, play your favorite slow song, and dance together for the entire song.",
        kinkFactor: 1,
        category: shared_1.CardCategory.PLAYFUL,
        tags: ["dancing", "music", "intimate"]
    },
    {
        title: "Sensual Feeding",
        description: "Blindfold your partner and feed them different fruits or chocolates, letting them guess what each one is.",
        kinkFactor: 2,
        category: shared_1.CardCategory.SENSUAL,
        tags: ["blindfold", "feeding", "sensual"]
    },
    {
        title: "Body Art",
        description: "Use washable body paint to create art on each other's bodies. Be creative and playful.",
        kinkFactor: 2,
        category: shared_1.CardCategory.PLAYFUL,
        tags: ["body paint", "art", "creative"]
    },
    {
        title: "Ice Play",
        description: "Use ice cubes to trace patterns on your partner's skin. Start gentle and see where it leads.",
        kinkFactor: 3,
        category: shared_1.CardCategory.INTIMATE,
        tags: ["ice", "sensation", "teasing"]
    },
    {
        title: "Truth or Dare",
        description: "Play an adult version of truth or dare with intimate questions and playful challenges.",
        kinkFactor: 2,
        category: shared_1.CardCategory.ADVENTURE,
        tags: ["truth", "dare", "questions"]
    }
];
const generateAIRecommendations = async (request, bedrock) => {
    try {
        const prompt = createAIPrompt(request);
        const response = await bedrock.invokeModel({
            modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                messages: [{
                        role: "user",
                        content: prompt
                    }],
                max_tokens: 3000,
                temperature: 0.7,
            })
        }).promise();
        const result = JSON.parse(Buffer.from(response.body).toString());
        const aiResponse = result.content[0].text;
        // Parse the AI response
        const cards = parseAIResponse(aiResponse);
        if (cards.length === 0) {
            console.warn('AI returned no valid cards, using fallback');
            return getFallbackCards(request.preferences);
        }
        return {
            cards,
            reasoning: extractReasoning(aiResponse)
        };
    }
    catch (error) {
        console.error('AI recommendation error:', error);
        return getFallbackCards(request.preferences);
    }
};
exports.generateAIRecommendations = generateAIRecommendations;
const createAIPrompt = (request) => {
    const { preferences, recentHistory, userRatings } = request;
    const recentTitles = recentHistory.slice(-10).map(card => card.title).join(', ');
    const highRatedCards = userRatings
        .filter(r => r.rating >= 4)
        .slice(-5)
        .map(r => `Card ${r.cardId}: ${r.rating}/5`)
        .join(', ');
    return `
Generate ${shared_1.GAME_CONFIG.DAILY_CARDS_COUNT} intimate activity cards for a couple. These should be creative, engaging, and appropriate for adults in a committed relationship.

COUPLE PREFERENCES:
- Max spice level: ${preferences?.maxKinkFactor || 2}/3 (1=romantic, 2=sensual, 3=intimate)
- Preferred categories: ${preferences?.categories?.join(', ') || 'all categories'}
- Excluded tags: ${preferences?.excludedTags?.join(', ') || 'none'}

RECENT ACTIVITIES TO AVOID:
${recentTitles || 'none'}

HIGHLY RATED ACTIVITIES (for inspiration):
${highRatedCards || 'none'}

REQUIREMENTS:
1. Include variety in spice levels (1-${preferences?.maxKinkFactor || 2})
2. Mix different categories: romance, sensual, date_night, playful, intimate, adventure
3. Avoid recently played activities
4. Consider both partners' comfort levels
5. Be creative but tasteful
6. Each activity should be completable in 30-60 minutes

CATEGORIES:
- romance: romantic gestures, emotional connection
- sensual: sensory experiences, touch-focused
- date_night: special activities, shared experiences  
- playful: fun, lighthearted, games
- intimate: close physical connection, private moments
- adventure: trying new things, exploring together

Return ONLY a valid JSON array in this exact format:
[
  {
    "title": "Activity Name",
    "description": "Clear, specific instructions for the activity (2-3 sentences)",
    "kinkFactor": 1,
    "category": "romance",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Make sure:
- Each description is 2-3 sentences with specific instructions
- Tags are relevant and descriptive (3-5 tags each)
- Categories are exactly one of the 6 listed above
- kinkFactor is 1, 2, or 3 only
- JSON is valid and properly formatted
`;
};
const parseAIResponse = (aiResponse) => {
    try {
        // Extract JSON from the response (AI might add text before/after)
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON array found in AI response');
            return [];
        }
        const cardsData = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(cardsData)) {
            console.error('AI response is not an array');
            return [];
        }
        // Validate and convert to Card objects
        const cards = [];
        for (const cardData of cardsData) {
            try {
                const card = validateAndCreateCard(cardData);
                if (card) {
                    cards.push(card);
                }
            }
            catch (error) {
                console.warn('Invalid card from AI:', cardData, error);
            }
        }
        return cards;
    }
    catch (error) {
        console.error('Failed to parse AI response:', error);
        return [];
    }
};
const validateAndCreateCard = (cardData) => {
    if (!cardData.title || typeof cardData.title !== 'string')
        return null;
    if (!cardData.description || typeof cardData.description !== 'string')
        return null;
    if (!cardData.kinkFactor || ![1, 2, 3].includes(cardData.kinkFactor))
        return null;
    if (!cardData.category || !Object.values(shared_1.CardCategory).includes(cardData.category))
        return null;
    if (!cardData.tags || !Array.isArray(cardData.tags))
        return null;
    return {
        id: (0, shared_1.generateId)('card'),
        title: cardData.title.trim(),
        description: cardData.description.trim(),
        kinkFactor: cardData.kinkFactor,
        category: cardData.category,
        tags: cardData.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()),
    };
};
const extractReasoning = (aiResponse) => {
    // Look for reasoning text before the JSON
    const jsonStart = aiResponse.indexOf('[');
    if (jsonStart > 0) {
        const reasoning = aiResponse.substring(0, jsonStart).trim();
        if (reasoning.length > 10) {
            return reasoning;
        }
    }
    return undefined;
};
const getFallbackCards = (preferences) => {
    const maxKink = preferences?.maxKinkFactor || 2;
    const preferredCategories = preferences?.categories || [];
    const excludedTags = preferences?.excludedTags || [];
    // Filter fallback cards based on preferences
    let availableCards = FALLBACK_CARDS.filter(card => {
        // Check spice level
        if (card.kinkFactor > maxKink)
            return false;
        // Check categories (if specified)
        if (preferredCategories.length > 0 && !preferredCategories.includes(card.category)) {
            return false;
        }
        // Check excluded tags
        if (excludedTags.some(tag => card.tags.includes(tag))) {
            return false;
        }
        return true;
    });
    // If no cards match preferences, use all mild cards
    if (availableCards.length === 0) {
        availableCards = FALLBACK_CARDS.filter(card => card.kinkFactor === 1);
    }
    // Ensure we have enough cards
    while (availableCards.length < shared_1.GAME_CONFIG.DAILY_CARDS_COUNT) {
        availableCards = [...availableCards, ...availableCards];
    }
    // Randomly select cards
    const selectedCards = [];
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(shared_1.GAME_CONFIG.DAILY_CARDS_COUNT, shuffled.length); i++) {
        selectedCards.push({
            ...shuffled[i],
            id: (0, shared_1.generateId)('card'),
        });
    }
    return {
        cards: selectedCards,
        reasoning: 'Using curated fallback cards due to AI unavailability'
    };
};
// Function to get user's rating history for AI context
const getUserRatingContext = (ratings) => {
    const ratingCounts = ratings.reduce((acc, rating) => {
        acc[rating.rating] = (acc[rating.rating] || 0) + 1;
        return acc;
    }, {});
    const totalRatings = ratings.length;
    if (totalRatings === 0)
        return 'No previous ratings';
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    return `Average rating: ${averageRating.toFixed(1)}/5 from ${totalRatings} activities. ` +
        `Ratings: ${Object.entries(ratingCounts).map(([rating, count]) => `${rating}★: ${count}`).join(', ')}`;
};
exports.getUserRatingContext = getUserRatingContext;
//# sourceMappingURL=ai.js.map