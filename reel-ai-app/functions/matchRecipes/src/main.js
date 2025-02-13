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

        const payload = JSON.parse(req.payload || '{}');
        const ingredients = payload.ingredients || [];
        const recipes = payload.recipes || [];

        log(JSON.stringify({
            message: 'Input received',
            ingredientCount: ingredients.length,
            recipeCount: recipes.length,
            ingredients,
            recipes
        }));

        // Early return if no recipes or ingredients
        if (recipes.length === 0) {
            log(JSON.stringify({ message: 'No recipes provided' }));
            return res.json({ 
                matches: [],
                error: 'No recipes provided'
            });
        }

        const prompt = `Return a JSON array of exactly 3 recipes that best match these ingredients: ${ingredients.join(", ")}.

Available recipes to choose from: ${recipes.join(", ")}.

Rules:
1. Response must be a valid JSON array with exactly 3 recipes
2. Each recipe must have: title (from available recipes), matchPercentage (0-100), and missingIngredients (array of strings)
3. Sort by highest match percentage first
4. Consider these as available even if not listed: water, salt, pepper, oil, basic spices
5. Base match percentage on estimated required ingredients vs available ingredients
6. For recipe titles, use EXACT matches from the available recipes list

Example response format:
[
  {
    "title": "EXACT_RECIPE_TITLE",
    "matchPercentage": 85,
    "missingIngredients": ["ingredient1", "ingredient2"]
  }
]

Remember: Return ONLY the JSON array, no other text. Use exact recipe titles from the provided list.`;

        log(JSON.stringify({ message: 'Sending request to OpenAI', model: 'gpt-4o-mini' }));
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "You are a JSON-only response bot. You must return valid JSON arrays exactly matching the requested format. No explanation text, just JSON."
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            temperature: 0.3,  // Lower temperature for more consistent results
            max_tokens: 1000
        }).catch(err => {
            error(JSON.stringify({ message: 'OpenAI API error', error: err.message }));
            return null;
        });

        if (!completion) {
            // Handle OpenAI API failure with fallback matches
            const fallbackMatches = recipes.slice(0, 3).map((title, index) => ({
                title,
                matchPercentage: 50 - (index * 10),
                missingIngredients: ["API error - ingredients unknown"]
            }));
            return res.json({ matches: fallbackMatches });
        }
        
        log(JSON.stringify({ message: 'Received response from OpenAI' }));
        
        let matches = [];
        try {
            const content = completion.choices[0].message.content.trim();
            log(JSON.stringify({ message: 'OpenAI response content', content }));
            
            // Try to extract JSON if there's any extra text
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const jsonContent = jsonMatch ? jsonMatch[0] : content;
            
            matches = JSON.parse(jsonContent);
            
            if (!Array.isArray(matches)) {
                throw new Error('Parsed response is not an array');
            }

            // Validate and fix each match
            matches = matches.map(match => ({
                title: match.title || 'Unknown Recipe',
                matchPercentage: Math.min(100, Math.max(0, parseInt(match.matchPercentage) || 0)),
                missingIngredients: Array.isArray(match.missingIngredients) ? 
                    match.missingIngredients.slice(0, 3) : 
                    ["Ingredients unknown"]
            }));

            // Ensure exactly 3 matches
            while (matches.length < 3 && recipes.length > matches.length) {
                const unusedRecipe = recipes.find(r => !matches.find(m => m.title === r));
                if (unusedRecipe) {
                    matches.push({
                        title: unusedRecipe,
                        matchPercentage: 30,
                        missingIngredients: ["Ingredients to be determined"]
                    });
                }
            }

            // Limit to top 3 and sort by match percentage
            matches = matches
                .slice(0, 3)
                .sort((a, b) => b.matchPercentage - a.matchPercentage);

        } catch (parseError) {
            error(JSON.stringify({ 
                message: 'Error handling OpenAI response', 
                error: parseError.message,
                content: completion.choices[0].message.content 
            }));
            // Use fallback matches
            matches = recipes.slice(0, 3).map((title, index) => ({
                title,
                matchPercentage: 50 - (index * 10),
                missingIngredients: ["Parse error - ingredients unknown"]
            }));
        }
        
        log(JSON.stringify({ 
            message: 'Returning matches', 
            matchCount: matches.length, 
            matches 
        }));

        return res.json({ 
            matches,
            success: true
        });
    } catch (e) {
        error(JSON.stringify({ 
            message: 'Critical error in function execution', 
            error: e.message,
            stack: e.stack 
        }));
        // Emergency fallback - we MUST return 3 recipes
        const fallbackMatches = (payload?.recipes || []).slice(0, 3).map((title, index) => ({
            title: title || `Recipe ${index + 1}`,
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