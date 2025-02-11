const { OpenAI } = require('openai');

module.exports = async function (req, res) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Parse the input payload
        const { existingItems, newItems } = JSON.parse(req.payload);

        // Prepare the prompt for GPT
        const prompt = `
            You are an intelligent kitchen inventory assistant. Analyze these items and determine how to combine them:

            Existing Items in Kitchen:
            ${JSON.stringify(existingItems, null, 2)}

            New Items to Add:
            ${JSON.stringify(newItems, null, 2)}

            Rules for combination:
            1. Items with exactly the same name (case-insensitive) should be considered the same item
            2. If units are the same, add the quantities
            3. If units are convertible (e.g., 'slice' and 'slices', 'g' and 'kg'), convert and combine
            4. If units are not convertible, keep as separate items
            5. Preserve the original item's ID when updating
            6. Keep all other properties (icon, etc.) from the original item

            Return a JSON object with exactly this structure:
            {
                "itemsToUpdate": [
                    // existing items that should be updated with new quantities
                    { "$id": "original_id", "name": "item name", "quantity": number, "unit": "unit", "icon": "icon_name" }
                ],
                "itemsToAdd": [
                    // completely new items or items that can't be combined
                    { "name": "item name", "quantity": number, "unit": "unit", "icon": "icon_name" }
                ]
            }

            Be smart about unit combinations and item names. For example:
            - "1 slice of bread" and "2 slices of bread" should combine
            - "500g sugar" and "0.5kg sugar" should combine
            - "Bread" and "bread" should be considered the same item
        `;

        // Call GPT for intelligent combination
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a precise kitchen inventory management AI. You only respond with valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" }
        });

        // Parse GPT's response
        const result = JSON.parse(completion.choices[0].message.content);

        // Validate the response structure
        if (!result.itemsToAdd || !result.itemsToUpdate) {
            throw new Error('Invalid AI response structure');
        }

        // Return the processed items
        res.json({
            itemsToAdd: result.itemsToAdd,
            itemsToUpdate: result.itemsToUpdate
        });

    } catch (error) {
        console.error('Error in combine_inventory_items:', error);
        
        // Return empty arrays if there's an error
        res.json({
            itemsToAdd: newItems,  // Just add all items as new if AI fails
            itemsToUpdate: []
        });
    }
};