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

        // Helper function to clean ingredient strings
        const cleanIngredient = (ingredient) => {
            // Remove quotes and leading/trailing spaces
            let cleaned = ingredient.replace(/^["']|["']$/g, '').trim().toLowerCase();
            
            // Remove measurements (e.g., "2 cups", "1/2 tsp")
            cleaned = cleaned.replace(/^[\d./]+ ?(cup|tsp|tbsp|teaspoon|tablespoon|pound|lb|oz|ounce|g|gram|ml|liter|l|piece|pieces|slice|slices|large|medium|small)s? ?/i, '');
            
            // Remove common prefixes and suffixes
            cleaned = cleaned.replace(/(chopped|minced|diced|sliced|ground|grated|softened|melted|fresh|dried|optional|for serving|for garnish|to taste)/g, '');
            
            // Remove parenthetical notes
            cleaned = cleaned.replace(/\([^)]*\)/g, '');
            
            // Remove section headers
            cleaned = cleaned.replace(/^(for|the|optional) .*:/i, '');
            
            // Final cleanup
            cleaned = cleaned.replace(/[,.].*$/, '') // Remove everything after comma or period
                           .replace(/\s+/g, ' ')     // Normalize spaces
                           .trim();                  // Final trim
            
            log(`Cleaned ingredient: "${ingredient}" -> "${cleaned}"`);
            return cleaned;
        };

        // Calculate matches with enhanced logging
        log('Starting recipe matching algorithm...');
        const matches = recipes.map(recipe => {
            log(`Processing recipe: ${recipe.title}`);
            
            // const availableIngredients = new Set([
            //     ...ingredients.map(i => cleanIngredient(i)),
            //     'water', 'salt', 'pepper', 'oil', 'butter', 
            //     'flour', 'sugar', 'garlic', 'onion'
            // ]);

            const availableIngredients = new Set([
                ...ingredients.map(i => cleanIngredient(i)),
                'water'
            ]);

            log(`Available ingredients for ${recipe.title}: ${JSON.stringify(Array.from(availableIngredients))}`);
            
            const recipeIngredients = Array.isArray(recipe.ingredients) 
                ? recipe.ingredients.map(i => cleanIngredient(i))
                    .filter(i => i && i.length > 0) // Remove empty strings
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
            log(`Matched ingredients: ${JSON.stringify(matchedIngredients)}`);
            log(`Missing ingredients: ${JSON.stringify(missingIngredients)}`);

            return {
                title: recipe.title,
                matchPercentage,
                missingIngredients: recipe.ingredients
                    .filter(i => missingIngredients.includes(cleanIngredient(i)))
                    .slice(0, 3)
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