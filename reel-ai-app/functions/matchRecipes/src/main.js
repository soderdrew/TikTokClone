const { OpenAI } = require('openai');

module.exports = async function (req, res) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const { ingredients, recipes } = JSON.parse(req.payload);
    
    console.log('Matching recipes with ingredients:', {
        ingredientCount: ingredients.length,
        recipeCount: recipes.length,
        ingredients,
        recipes
    });

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

    try {
        console.log('Sending request to OpenAI...');
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });
        
        console.log('Received response from OpenAI');
        
        let matches = [];
        try {
            const content = completion.choices[0].message.content;
            console.log('OpenAI response content:', content);
            
            matches = JSON.parse(content);
            if (!Array.isArray(matches)) {
                console.error('Parsed response is not an array:', matches);
                matches = [];
            } else {
                console.log('Successfully parsed matches:', matches);
            }
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            matches = [];
        }
        
        console.log('Returning matches:', { matchCount: matches.length, matches });
        res.json({ matches });
    } catch (e) {
        console.error('Error calling OpenAI:', e);
        res.json({ matches: [] });
    }
}