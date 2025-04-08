import menuData from "../../../data/restaurant_menu.json";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract structured filters from user query using Gemini
 */
async function extractFiltersUsingGemini(userQuery) {
    const prompt = `Extract structured information from the following user query:
    Query: "${userQuery}"
    Return a JSON object with:
    - dietary (Vegetarian, Non-Vegetarian, Vegan, Gluten-Free, or null if not mentioned)
    - price_range (Numeric value if mentioned, or null)
    - restaurant (Restaurant name if mentioned, or null)
    - ingredients (List of ingredients if mentioned, or empty list)
    - spiciness (Mild, Medium, Spicy, or null)

    Example Output (return only valid JSON, no Markdown formatting):
    {
      "dietary": "Vegetarian",
      "price_range": 200,
      "restaurant": "Dominos",
      "ingredients": ["cheese", "tomato"],
      "spiciness": "Medium",
      "gluten_free": "Yes"
    }`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);
        let textResponse = response.response.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(textResponse || "{}");
    } catch (error) {
        console.error("Gemini API Error (extract filters):", error);
        return {};
    }
}

/**
 * Filter menu items based on extracted filters
 */
function filterMenuItems(filters) {
    return menuData.filter(dish => {
        const matchesDiet = filters.dietary
            ? dish.dietary_info.toLowerCase() === filters.dietary.toLowerCase()
            : true;

        const matchesPrice = filters.price_range
            ? dish.Price && dish.Price <= filters.price_range
            : true;

        const matchesRestaurant = filters.restaurant
            ? dish.restaurant_name.toLowerCase().includes(filters.restaurant.toLowerCase())
            : true;

        const matchesSpiciness = filters.spiciness
            ? dish["Spice-Level"] && dish["Spice-Level"].toLowerCase() === filters.spiciness.toLowerCase()
            : true;

        const matchesGlutenFree = filters.ingredients.includes("gluten-free")
            ? dish["Gluten-Free"] && dish["Gluten-Free"].toLowerCase() === "yes"
            : true;

        return matchesDiet && matchesPrice && matchesRestaurant && matchesSpiciness && matchesGlutenFree;
    });
}

/**
 * Validate filtered dishes using Gemini
 */
async function validateDishesWithGemini(dishes, filters) {
    if (dishes.length === 0) return [];

    const validationPrompt = `Validate the following dishes based on user preferences:
- Dietary Preference: "${filters.dietary || 'None'}"
- Restaurant: "${filters.restaurant || 'None'}"
- Price Range: "${filters.price_range || 'None'}"
- Gluten-Free: "${filters.gluten_free === "Yes" ? "Yes" : "No"}"

Return a JSON array where each object contains:
{
  "dish_name": "Dish Name",
  "is_valid": true or false,
  "reason": "Why the dish is valid/invalid"
}

Dishes to validate:
${dishes.map(dish => `- ${dish.dish_name}: ${dish.description}, Gluten-Free: ${dish["Gluten-Free"]}, Price: ${dish.Price}`).join("\n")}`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(validationPrompt);
        let textResponse = response.response.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const validationResults = JSON.parse(textResponse || "[]");

        return dishes.filter(dish =>
            validationResults.some(result => result.dish_name === dish.dish_name && result.is_valid)
        );
    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return dishes; // Fallback: return all dishes if validation fails
    }
}

/**
 * Generate final response using Gemini
 */
async function generateGeminiResponse(userQuery, validatedDishes) {
    const prompt = `Based on the following user query and matching dishes, generate a helpful and concise response:

User Query: "${userQuery}"

Matching Dishes:
${validatedDishes.map(d => `- ${d.dish_name}: ${d.description} (Price: ₹${d.Price})`).join("\n")}

Return a friendly response that:
- Mentions 2-3 matching dishes by name
- Highlights dietary or spiciness preferences if matched
- Is short and helpful (within 3-4 lines)`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);
        const textResponse = response.response.candidates[0].content.parts[0].text;
        return textResponse.trim();
    } catch (error) {
        console.error("Gemini Response Generation Error:", error);
        return "An error occurred while generating a response.";
    }
}

/**
 * API Route Handler (Next.js - App Router)
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const userMessage = body.message;

        // Step 1: Extract filters
        const filters = await extractFiltersUsingGemini(userMessage);
        console.log("Extracted Filters:", filters);

        // Step 2: Filter menu items
        const filteredDishes = filterMenuItems(filters);
        console.log("Filtered Dishes:", filteredDishes);

        // Step 3: Validate dishes
        const validatedDishes = await validateDishesWithGemini(filteredDishes, filters);
        console.log("Validated Dishes:", validatedDishes);

        // Step 4: Generate Gemini response
        if (validatedDishes.length > 0) {
            const response = await generateGeminiResponse(userMessage, validatedDishes);
            return new Response(JSON.stringify({ reply: response }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Step 5: No valid dishes
        return new Response(JSON.stringify({ reply: "Sorry, no suitable dishes found for your preferences." }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("🔴 Restaurant API Error:", error);
        return new Response(JSON.stringify({ error: "An error occurred while processing your request." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
