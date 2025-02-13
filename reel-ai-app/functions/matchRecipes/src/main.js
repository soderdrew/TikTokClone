const { OpenAI } = require('openai');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    try {
        // MISSION CRITICAL: Enhanced payload parsing
        log('Starting recipe matching - CRITICAL MISSION');
        
        // Get the raw body from the request
        const rawBody = req.body || req.payload;
        log(`Raw request body: ${JSON.stringify(rawBody)}`);
        
        let payload;
        try {
            // Handle different payload formats
            if (typeof rawBody === 'string') {
                payload = JSON.parse(rawBody);
            } else if (rawBody && typeof rawBody === 'object') {
                payload = rawBody;
            } else {
                payload = {};
            }
            log(`Parsed payload: ${JSON.stringify(payload)}`);
        } catch (parseError) {
            error(`Payload parsing error: ${parseError.message}`);
            throw new Error(`Invalid payload format: ${parseError.message}`);
        }

        // Extract data with detailed logging
        const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
        const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
        
        log(`Found ${ingredients.length} ingredients and ${recipes.length} recipes`);
        log(`Ingredients: ${JSON.stringify(ingredients)}`);
        log(`Recipes: ${JSON.stringify(recipes.map(r => r.title))}`);

        if (recipes.length === 0) {
            log('CRITICAL: No recipes found in payload');
            return res.json({ 
                matches: [],
                error: 'No recipes provided'
            });
        }

        // Calculate matches with enhanced logging
        log('Starting recipe matching algorithm...');
        const matches = recipes.map(recipe => {
            log(`Processing recipe: ${recipe.title}`);
            
            const availableIngredients = new Set([
                ...ingredients.map(i => i.toLowerCase()),
                'water', 'salt', 'pepper', 'oil', 'butter', 
                'flour', 'sugar', 'garlic', 'onion'
            ]);

            log(`Available ingredients for ${recipe.title}: ${JSON.stringify(Array.from(availableIngredients))}`);
            
            const recipeIngredients = Array.isArray(recipe.ingredients) 
                ? recipe.ingredients.map(i => i.toLowerCase())
                : [];
                
            log(`Recipe ingredients for ${recipe.title}: ${JSON.stringify(recipeIngredients)}`);

            const matchedIngredients = recipeIngredients.filter(ingredient => 
                availableIngredients.has(ingredient)
            );

            const missingIngredients = recipeIngredients.filter(ingredient => 
                !availableIngredients.has(ingredient)
            );

            const matchPercentage = recipeIngredients.length > 0
                ? Math.round((matchedIngredients.length / recipeIngredients.length) * 100)
                : 0;

            log(`Match results for ${recipe.title}: ${matchPercentage}% match`);

            return {
                title: recipe.title,
                matchPercentage,
                missingIngredients: missingIngredients.slice(0, 3)
            };
        });

        // Sort and select top matches
        const topMatches = matches
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, 3);

        log(`Final matches selected: ${JSON.stringify(topMatches)}`);

        // Return successful response
        return res.json({ 
            matches: topMatches,
            success: true
        });
    } catch (e) {
        error(`CRITICAL ERROR: ${e.message}`);
        error(`Stack trace: ${e.stack}`);
        
        // Emergency fallback with basic recipes
        const fallbackMatches = [
            { title: "Emergency Recipe 1", matchPercentage: 40, missingIngredients: ["Emergency fallback"] },
            { title: "Emergency Recipe 2", matchPercentage: 30, missingIngredients: ["Emergency fallback"] },
            { title: "Emergency Recipe 3", matchPercentage: 20, missingIngredients: ["Emergency fallback"] }
        ];
        
        return res.json({ 
            matches: fallbackMatches,
            error: e.message
        });
    }
}