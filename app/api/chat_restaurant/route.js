import menuData from "../../../data/restaurant_menu.json";
import { GoogleGenerativeAI } from "@google/generative-ai";
// API URLs & Keys
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText";
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

/**
 * Extract structured filters from user query using Gemini
 */


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
      "gluten_free":"Yes"
    }`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);

        console.log("Raw Gemini Response:", response);

        // Extract response text
        let textResponse = response.response.candidates[0].content.parts[0].text;

        // 🔹 Remove Markdown formatting if present
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(textResponse || "{}");

    } catch (error) {
        console.error("Gemini API Error:", error);
        return {};
    }
}


/**
 * Filter menu items based on extracted filters
 */
function filterMenuItems(filters) {
    return menuData.filter(dish => {
        let matchesDiet = filters.dietary 
            ? dish.dietary_info.toLowerCase() === filters.dietary.toLowerCase()
            : true;

        let matchesPrice = filters.price_range 
            ? dish.Price && dish.Price <= filters.price_range 
            : true;

        let matchesRestaurant = filters.restaurant 
            ? dish.restaurant_name.toLowerCase().includes(filters.restaurant.toLowerCase()) 
            : true;

        let matchesSpiciness = filters.spiciness
            ? dish["Spice-Level"] && dish["Spice-Level"].toLowerCase() === filters.spiciness.toLowerCase()
            : true;

        let matchesGlutenFree = filters.ingredients.includes("gluten-free") 
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
    - User Requested Dietary Preference: "${filters.dietary || 'None'}"
    - User Requested Restaurant: "${filters.restaurant || 'None'}"
    - User Requested Price Range: "${filters.price_range || 'None'}"
    - User Requested Gluten-Free: "${filters.gluten_free === "Yes" ? "Yes" : "No"}"

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

        console.log("Raw Gemini Validation Response:", response);

        // **Extract response text & remove Markdown formatting**
        let textResponse = response.response.candidates[0].content.parts[0].text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        // **Parse JSON response**
        let validationResults = JSON.parse(textResponse || "[]");

        // **Filter valid dishes**
        let validDishes = dishes.filter(dish =>
            validationResults.some(result => result.dish_name === dish.dish_name && result.is_valid)
        );

        return validDishes;

    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return dishes;  // **Fallback: return all filtered dishes if Gemini validation fails**
    }
}

/**
 * Generate structured response with Cohere
 */
async function generateCohereResponse(prompt) {
    try {
        const response = await fetch("https://api.cohere.ai/v1/generate", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${COHERE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ model: "command", prompt, max_tokens: 200 })
        });

        const data = await response.json();
        return data.generations?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
        console.error("Error fetching response from Cohere:", error);
        return "An error occurred while processing your request.";
    }
}

/**
 * Main API handler
 */
// export default async function handler(req, res) {
//     let userMessage = req.body.message.toLowerCase();

//     // Step 1: Extract structured filters from query
//     let filters = await extractFiltersUsingGemini(userMessage);
//     console.log("Extracted Filters:", filters);

//     // Step 2: Filter menu items based on extracted filters
//     let filteredDishes = filterMenuItems(filters);
//     console.log("Filtered Dishes:", filteredDishes);

//     // Step 3: Validate dishes using Gemini
//     let validatedDishes = await validateDishesWithGemini(filteredDishes, filters);
//     console.log("Validated Dishes:", validatedDishes);

//     // Step 4: Generate response using Cohere
//     if (validatedDishes.length > 0) {
//         const dishDetails = validatedDishes.map(d => `${d.dish_name} - ${d.description}`).join("\n");
//         const response = await generateCohereResponse(`User Query: "${userMessage}". Matching Dishes: ${dishDetails}. Provide a structured response.`);
//         return res.status(200).json({ reply: response });
//     }

//     // Step 5: If no validated dishes found, let AI handle the query
//     // const aiResponse = await generateCohereResponse(userMessage);
//     return res.status(200).json({ reply: "Not available" });
// }
export async function POST(req) {
    try {
        const body = await req.json();
        let userMessage = body.message;

        // Step 1: Extract structured filters from query
        let filters = await extractFiltersUsingGemini(userMessage);
        console.log("Extracted Filters:", filters);

        // Step 2: Filter menu items based on extracted filters
        let filteredDishes = filterMenuItems(filters);
        console.log("Filtered Dishes:", filteredDishes);

        // Step 3: Validate dishes using Gemini
        let validatedDishes = await validateDishesWithGemini(filteredDishes, filters);
        console.log("Validated Dishes:", validatedDishes);

        // Step 4: Generate response using Cohere
        if (validatedDishes.length > 0) {
            const dishDetails = validatedDishes.map(d => `${d.dish_name} - ${d.description}`).join("\n");
            const response = await generateCohereResponse(`User Query: "${userMessage}". Matching Dishes: ${dishDetails}. Provide a structured response.`);
            return new Response(JSON.stringify({ reply: response }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // Step 5: If no validated dishes found
        return new Response(JSON.stringify({ reply: "Not available" }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("🔴 API Error:", error);
        return new Response(JSON.stringify({ error: "An error occurred while processing your request." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
