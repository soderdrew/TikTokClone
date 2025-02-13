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

        const prompt = `
        I have the following ingredients: ${ingredients.join(", ")}.

        And here's a list of recipe titles available: ${recipes.join(", ")}.

        Analyze which recipes I can make with my current ingredients. Always return exactly 3 recipes as a JSON array, selecting the best matches based on available ingredients. Use this format:
        [
          {
            "title": "Recipe Title",
            "matchPercentage": 85,  // percentage of required ingredients I have
            "missingIngredients": ["ingredient1", "ingredient2"]  // key ingredients I'm missing
          }
        ]
        
        Important:
        1. Always return exactly 3 recipes, even if the match percentages are low
        2. Sort by highest match percentage first
        3. For recipes with similar titles, assume similar core ingredients
        4. Consider common pantry staples (salt, pepper, water) as available
        Format the response as valid JSON only, no additional text.`;

        log(JSON.stringify({ message: 'Sending request to OpenAI', model: 'gpt-4' }));
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        log(JSON.stringify({ message: 'Received response from OpenAI' }));
        
        let matches = [];
        try {
            const content = completion.choices[0].message.content;
            log(JSON.stringify({ message: 'OpenAI response content', content }));
            
            matches = JSON.parse(content);
            if (!Array.isArray(matches)) {
                error(JSON.stringify({ 
                    message: 'Parsed response is not an array', 
                    matches,
                    type: typeof matches 
                }));
                matches = [];
            } else {
                log(JSON.stringify({ 
                    message: 'Successfully parsed matches', 
                    matchCount: matches.length,
                    matches 
                }));
            }
        } catch (parseError) {
            error(JSON.stringify({ 
                message: 'Error parsing OpenAI response', 
                error: parseError.message,
                content: completion.choices[0].message.content 
            }));
            matches = [];
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
        return res.json({ 
            matches: [],
            error: e.message 
        });
    }
}