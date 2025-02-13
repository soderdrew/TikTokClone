const { OpenAI } = require('openai');

module.exports = async function (req, res) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const { ingredients, recipes } = JSON.parse(req.payload);

    const prompt = `
    I have the following ingredients: ${ingredients.join(", ")}.

    And here's a list of recipe titles available: ${recipes.join(", ")}.

    Which recipes can I make with my current ingredients? Return only the titles of these recipes.
    If no recipes can be made return an empty array. Do not respond in conversational format.`;
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        console.log(completion)
        const recipeList = completion.choices[0].message.content;
        res.json({ recipes: recipeList ? JSON.parse(recipeList) : [] });
    } catch (e) {
        console.log(e)
        res.json({ recipes: [] });
    }
}