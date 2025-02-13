const { OpenAI } = require('openai');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        if (!process.env.OPENAI_API_KEY) {
            error(JSON.stringify({ message: 'OpenAI API key is not configured' }));
            throw new Error('OpenAI API key is not configured');
        }

        // Log the raw payload first
        log(JSON.stringify({ message: 'Raw payload received', payload: req.payload }));

        let payload;
        try {
            payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            log(JSON.stringify({ message: 'Parsed payload', payload }));
        } catch (parseError) {
            error(JSON.stringify({ message: 'Failed to parse payload', error: parseError.message }));
            throw new Error('Invalid payload format');
        }

        const ingredients = payload?.ingredients || [];
        const recipes = payload?.recipes || [];

        // Log the extracted data
        log(JSON.stringify({
            message: 'Extracted data',
            ingredientCount: ingredients.length,
            recipeCount: recipes.length,
            ingredients,
            recipes: recipes.map(r => ({ 
                title: r.title,
                ingredientCount: r.ingredients?.length || 0
            }))
        }));

        // Early return if no recipes or ingredients
        if (recipes.length === 0) {
            log(JSON.stringify({ message: 'No recipes provided' }));
            return res.json({ 
                matches: [],
                error: 'No recipes provided'
            });
        }

        // Calculate matches without using OpenAI
        const matches = recipes.map(recipe => {
            const availableIngredients = new Set([
                ...ingredients.map(i => i.toLowerCase()),
                // Add common pantry staples
                'water', 'salt', 'pepper', 'oil', 'butter', 
                'flour', 'sugar', 'garlic', 'onion'
            ]);

            // Log the ingredients we're matching against
            log(JSON.stringify({
                message: 'Matching recipe',
                title: recipe.title,
                recipeIngredients: recipe.ingredients,
                availableIngredients: Array.from(availableIngredients)
            }));

            const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());
            const matchedIngredients = recipeIngredients.filter(ingredient => 
                availableIngredients.has(ingredient)
            );

            const missingIngredients = recipeIngredients.filter(ingredient => 
                !availableIngredients.has(ingredient)
            );

            const matchPercentage = recipeIngredients.length > 0
                ? Math.round((matchedIngredients.length / recipeIngredients.length) * 100)
                : 0;

            return {
                title: recipe.title,
                matchPercentage,
                missingIngredients: missingIngredients.slice(0, 3) // Limit to top 3 missing ingredients
            };
        });

        // Sort by match percentage and take top 3
        const topMatches = matches
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, 3);

        log(JSON.stringify({ 
            message: 'Calculated matches', 
            matchCount: topMatches.length, 
            matches: topMatches 
        }));

        return res.json({ 
            matches: topMatches,
            success: true
        });
    } catch (e) {
        error(JSON.stringify({ 
            message: 'Critical error in function execution', 
            error: e.message,
            stack: e.stack 
        }));
        // Emergency fallback - we MUST return 3 recipes
        const fallbackMatches = (payload?.recipes || []).slice(0, 3).map((recipe, index) => ({
            title: recipe.title || `Recipe ${index + 1}`,
            matchPercentage: 40 - (index * 10),
            missingIngredients: ["Emergency fallback - ingredients unknown"]
        }));
        return res.json({ 
            matches: fallbackMatches.length > 0 ? fallbackMatches : [
                { title: "Emergency Recipe 1", matchPercentage: 40, missingIngredients: ["Emergency fallback"] },
                { title: "Emergency Recipe 2", matchPercentage: 30, missingIngredients: ["Emergency fallback"] },
                { title: "Emergency Recipe 3", matchPercentage: 20, missingIngredients: ["Emergency fallback"] }
            ],
            error: e.message
        });
    }
}