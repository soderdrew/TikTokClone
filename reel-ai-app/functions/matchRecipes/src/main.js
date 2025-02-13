const { OpenAI } = require('openai');

module.exports = async function (req, res) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const { ingredients, recipes } = JSON.parse(req.payload);

    const prompt = `
    I have the following ingredients: ${ingredients.join(", ")}.

    And here's a list of recipe titles available: ${recipes.join(", ")}.

    Analyze which recipes I can make with my current ingredients. Return the top 3 recipes as a JSON array with the following format:
    [
      {
        "title": "Recipe Title",
        "matchPercentage": 85,  // percentage of required ingredients I have
        "missingIngredients": ["ingredient1", "ingredient2"]  // key ingredients I'm missing
      }
    ]
    
    Only include recipes where I have at least 60% of the ingredients. If no recipes meet this criteria, return an empty array.
    Format the response as valid JSON only, no additional text.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        
        let matches = [];
        try {
            matches = JSON.parse(completion.choices[0].message.content);
            if (!Array.isArray(matches)) {
                matches = [];
            }
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            matches = [];
        }
        
        res.json({ matches });
    } catch (e) {
        console.error('Error calling OpenAI:', e);
        res.json({ matches: [] });
    }
}