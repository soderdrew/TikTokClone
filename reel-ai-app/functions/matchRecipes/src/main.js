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

        const payload = JSON.parse(req.payload);
        const { ingredients, recipes } = payload;

        if (!ingredients || !Array.isArray(ingredients) || !recipes || !Array.isArray(recipes)) {
            error(JSON.stringify({ 
                message: 'Invalid input format', 
                payload,
                hasIngredients: !!ingredients,
                hasRecipes: !!recipes,
                ingredientsIsArray: Array.isArray(ingredients),
                recipesIsArray: Array.isArray(recipes)
            }));
            throw new Error('Invalid input format: ingredients and recipes must be arrays');
        }
        
        log(JSON.stringify({
            message: 'Matching recipes with ingredients',
            ingredientCount: ingredients.length,
            recipeCount: recipes.length,
            ingredients,
            recipes
        }));

        const prompt = `You are a helpful cooking assistant. Your task is to analyze the available ingredients and suggest the best matching recipes.

Available ingredients: ${ingredients.join(", ")}.

Available recipe titles: ${recipes.join(", ")}.

Instructions:
1. For each recipe title, estimate the common ingredients it would need based on the recipe name
2. Calculate a match percentage based on how many of those ingredients the user has
3. ALWAYS return exactly 3 recipes, even if match percentages are low
4. Consider these as available basic ingredients even if not listed: water, salt, pepper, oil, common spices
5. For each recipe, list the key ingredients that are missing (max 3 most important ones)

Return your response in this exact JSON format:
[
  {
    "title": "Recipe Title",
    "matchPercentage": 85,
    "missingIngredients": ["ingredient1", "ingredient2"]
  }
]

Important rules:
- You must return exactly 3 recipes
- Sort by highest match percentage first
- Always return valid JSON
- Don't include any explanation text, just the JSON array
- If a recipe needs very few ingredients and user has most of them, give it a high match percentage
- If unsure about exact ingredients, make reasonable assumptions based on recipe title`;

        log(JSON.stringify({ message: 'Sending request to OpenAI', model: 'gpt-4' }));
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,  // Lower temperature for more consistent results
            max_tokens: 1000,
            response_format: { type: "json_object" }  // Force JSON response
        });
        
        log(JSON.stringify({ message: 'Received response from OpenAI' }));
        
        let matches = [];
        try {
            const content = completion.choices[0].message.content;
            log(JSON.stringify({ message: 'OpenAI response content', content }));
            
            const parsed = JSON.parse(content);
            matches = parsed.recipes || parsed; // Handle both formats
            
            if (!Array.isArray(matches)) {
                error(JSON.stringify({ 
                    message: 'Parsed response is not an array', 
                    matches,
                    type: typeof matches 
                }));
                // Instead of empty array, create fallback matches
                matches = recipes.slice(0, 3).map((title, index) => ({
                    title,
                    matchPercentage: 50 - (index * 10),
                    missingIngredients: ["Ingredient information unavailable"]
                }));
            } else {
                log(JSON.stringify({ 
                    message: 'Successfully parsed matches', 
                    matchCount: matches.length,
                    matches 
                }));
            }

            // Ensure we always have exactly 3 matches
            while (matches.length < 3 && recipes.length > matches.length) {
                const unusedRecipe = recipes.find(r => !matches.find(m => m.title === r));
                if (unusedRecipe) {
                    matches.push({
                        title: unusedRecipe,
                        matchPercentage: 30,
                        missingIngredients: ["Ingredient information unavailable"]
                    });
                }
            }

            // Limit to top 3 if we somehow got more
            matches = matches.slice(0, 3);
        } catch (parseError) {
            error(JSON.stringify({ 
                message: 'Error parsing OpenAI response', 
                error: parseError.message,
                content: completion.choices[0].message.content 
            }));
            // Create fallback matches instead of empty array
            matches = recipes.slice(0, 3).map((title, index) => ({
                title,
                matchPercentage: 50 - (index * 10),
                missingIngredients: ["Ingredient information unavailable"]
            }));
        }
        
        log(JSON.stringify({ 
            message: 'Returning matches', 
            matchCount: matches.length, 
            matches 
        }));

        return res.json({ matches });
    } catch (e) {
        error(JSON.stringify({ 
            message: 'Error in function execution', 
            error: e.message,
            stack: e.stack 
        }));
        // Even in case of error, return some matches
        const fallbackMatches = recipes.slice(0, 3).map((title, index) => ({
            title,
            matchPercentage: 40 - (index * 10),
            missingIngredients: ["Error occurred while matching"]
        }));
        return res.json({ 
            matches: fallbackMatches,
            error: e.message 
        });
    }
}