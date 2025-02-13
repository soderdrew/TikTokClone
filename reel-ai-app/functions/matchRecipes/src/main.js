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
            if (!ingredient || typeof ingredient !== 'string') return '';

            // Remove extra quotes and backslashes
            let cleaned = ingredient.replace(/\\"|\\'/g, '')  // Remove escaped quotes
                                  .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                                  .trim()
                                  .toLowerCase();

            // Skip section headers and empty strings
            if (cleaned.includes(':') || cleaned.length === 0) return '';

            // Remove measurements with units
            cleaned = cleaned.replace(/^[\d\s./]+(cup|tsp|tbsp|teaspoon|tablespoon|pound|lb|oz|ounce|g|gram|ml|liter|l)s?\b/i, '');
            
            // Remove numeric quantities at start
            cleaned = cleaned.replace(/^[\d\s./]+/, '');

            // Remove common descriptors and states
            const descriptors = [
                'large', 'medium', 'small', 'fresh', 'dried', 'ground', 'chopped',
                'minced', 'diced', 'sliced', 'grated', 'shredded', 'softened',
                'melted', 'room temperature', 'cold', 'warm', 'hot', 'frozen',
                'canned', 'whole', 'all-purpose', 'purpose'
            ];
            const descriptorPattern = new RegExp(`\\b(${descriptors.join('|')})\\b`, 'gi');
            cleaned = cleaned.replace(descriptorPattern, '');

            // Remove parenthetical notes
            cleaned = cleaned.replace(/\([^)]*\)/g, '');

            // Remove everything after common separators
            cleaned = cleaned.split(/[,.]|\bor\b|\bfor\b/)[0];

            // Final cleanup
            cleaned = cleaned.replace(/\s+/g, ' ') // Normalize spaces
                           .trim();

            // Special cases
            if (cleaned.includes('egg')) cleaned = 'eggs';
            if (cleaned.includes('bread crumb')) cleaned = 'breadcrumbs';

            log(`Cleaned ingredient: "${ingredient}" -> "${cleaned}"`);
            return cleaned;
        };

        // Helper function to check if two ingredients match using word-by-word comparison
        const ingredientsMatch = (recipeIngredient, availableIngredient) => {
            const recipeWords = recipeIngredient.split(/\s+/).filter(word => word.length > 2);
            const availableWords = availableIngredient.split(/\s+/);
            
            return recipeWords.some(recipeWord => 
                availableWords.some(availableWord => 
                    availableWord === recipeWord || 
                    (availableWord.endsWith('s') && availableWord.slice(0, -1) === recipeWord) ||
                    (recipeWord.endsWith('s') && recipeWord.slice(0, -1) === availableWord)
                )
            );
        };

        // Calculate matches with enhanced logging
        log('Starting recipe matching algorithm...');
        const matches = recipes.map(recipe => {
            log(`Processing recipe: ${recipe.title}`);
            
            const availableIngredients = new Set([
                ...ingredients.map(i => cleanIngredient(i)),
                'water', 'salt', 'pepper', 'oil', 'butter', 
                'flour', 'sugar', 'garlic', 'onion'
            ]);

            log(`Available ingredients for ${recipe.title}: ${JSON.stringify(Array.from(availableIngredients))}`);
            
            // Handle recipe ingredients that might be an array of strings or a single string
            const recipeIngredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [recipe.ingredients])
                .map(i => cleanIngredient(i))
                .filter(i => i && i.length > 0 && !i.includes(':')); // Remove empty strings and headers
                
            log(`Recipe ingredients for ${recipe.title}: ${JSON.stringify(recipeIngredients)}`);

            const matchedIngredients = recipeIngredients.filter(recipeIngredient => 
                Array.from(availableIngredients).some(availableIngredient => 
                    ingredientsMatch(recipeIngredient, availableIngredient)
                )
            );

            const missingIngredients = recipeIngredients.filter(recipeIngredient => 
                !Array.from(availableIngredients).some(availableIngredient => 
                    ingredientsMatch(recipeIngredient, availableIngredient)
                )
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