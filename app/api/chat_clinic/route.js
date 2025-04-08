import clinicData from "../../../data/clinic_appointments.json";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 🔹 Utility: Add timeout for Gemini API
 */
function timeoutAfter(ms, promise) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), ms)
        ),
    ]);
}

/**
 * 🔹 Convert Date (YYYY-MM-DD) to Day of the Week
 */
function getDayFromDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Saturday"
}

/**
 * 🔹 Extract structured details from user query
 */
async function extractClinicFilters(userQuery) {
    console.log("🔹 User Query:", userQuery);

    const prompt = `Extract structured information from the user query:
    Query: "${userQuery}"
    Return a JSON object:
    {
      "doctor_name": "Doctor's Name" or null,
      "specialization": "Specialization" or null,
      "date": "YYYY-MM-DD" or null,
      "time": "HH:MM" or null
    }`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);
        const parts = response.response.candidates[0].content.parts;

        console.log("🔎 Raw Gemini Output:", parts);

        let textResponse = parts[0].text || "";
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        if (!textResponse.includes("{")) throw new Error("Invalid Gemini output format");

        console.log("🟢 Extracted Filters:", textResponse);

        return JSON.parse(textResponse || "{}");
    } catch (error) {
        console.error("🔴 Gemini Extraction Error:", error);
        return {};
    }
}

/**
 * 🔹 Find available doctors & recommend best time slot
 */
function findAvailableDoctors(filters) {
    console.log("🟢 Filters received for doctor search:", filters);

    let { doctor_name, specialization, date, time } = filters;

    let dayOfWeek = date ? getDayFromDate(date) : null;
    console.log("🟢 Converted Date to Day:", dayOfWeek);

    let requestedTime = null;
    if (time && /^\d{1,2}:\d{2}$/.test(time.trim())) {
        requestedTime = parseInt(time.split(":")[0]);
    }

    let matchingDoctors = clinicData.filter(doctor => {
        let availabilityObject = JSON.parse(doctor.availability.replace(/'/g, '"'));

        if (doctor_name && !doctor.name.toLowerCase().includes(doctor_name.toLowerCase())) return false;
        if (specialization && doctor.specialization.toLowerCase() !== specialization.toLowerCase()) return false;
        if (dayOfWeek && !(dayOfWeek in availabilityObject)) return false;

        if (requestedTime !== null && dayOfWeek) {
            let availableSlots = availabilityObject[dayOfWeek] || [];
            let isTimeAvailable = availableSlots.some(slot => {
                let [start, end] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                return requestedTime >= start && requestedTime < end;
            });

            if (!isTimeAvailable) return false;
        }

        return true;
    });

    if (matchingDoctors.length === 0) {
        console.log("❌ No doctors matched the given filters.");
        return { error: "No doctors available for the requested criteria." };
    }

    console.log(`🟢 Found ${matchingDoctors.length} doctor(s):`, matchingDoctors.map(d => d.name));

    let availableOptions = matchingDoctors.map(doctor => {
        let availabilityObject = JSON.parse(doctor.availability.replace(/'/g, '"'));
        let originalSlots = dayOfWeek && availabilityObject[dayOfWeek] ? availabilityObject[dayOfWeek] : [];

        let splitSlots = [];
        let availableMessage = "";
        let suggestions = [];

        if (dayOfWeek && originalSlots.length > 0) {
            originalSlots.forEach(slot => {
                let [slotStart, slotEnd] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                for (let i = slotStart; i < slotEnd; i++) {
                    splitSlots.push(`${i}:00-${i + 1}:00`);
                }
            });
        }

        if (requestedTime !== null && splitSlots.length > 0) {
            let matchingSlot = splitSlots.find(slot => {
                let [slotStart, slotEnd] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                return requestedTime >= slotStart && requestedTime < slotEnd;
            });

            if (matchingSlot) {
                availableMessage = `✅ Dr. ${doctor.name} is available at ${matchingSlot} on ${dayOfWeek}, ${date}. Would you like to book this slot?`;
            } else {
                let nearestSlot = splitSlots.find(slot => requestedTime < parseInt(slot.split("-")[0]));
                if (nearestSlot) {
                    suggestions.push(`❌ Dr. ${doctor.name} is not available at ${time}. Nearest slot: ${nearestSlot}.`);
                } else {
                    suggestions.push(`❌ No available slots at ${time} on ${dayOfWeek}.`);
                }
            }
        } else if (dayOfWeek && splitSlots.length > 0) {
            availableMessage = `✅ Dr. ${doctor.name} is available on ${dayOfWeek}, ${date} at: ${splitSlots.join(", ")}.`;
        } else if (dayOfWeek) {
            suggestions.push(`❌ Dr. ${doctor.name} is not available on ${dayOfWeek}.`);
        } else {
            availableMessage = `✅ Dr. ${doctor.name} is available. Fee: ₹${doctor.consultation_fee.toFixed(2)}.`;
        }

        return {
            doctor: doctor.name,
            specialization: doctor.specialization,
            available_days: Object.keys(availabilityObject),
            message: availableMessage || suggestions.join(" "),
            consultation_fee: doctor.consultation_fee,
            rating: doctor.rating,
        };
    });

    availableOptions.sort((a, b) => b.rating - a.rating);
    return { availableOptions };
}

/**
 * 🔹 Generate AI response
 */
async function generateResponseWithGemini(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);
        const aiResponse = response.response.candidates[0].content.parts[0].text;
        console.log("🟢 AI Generated Response:", aiResponse);
        return aiResponse;
    } catch (error) {
        console.error("🔴 Gemini API Error:", error);
        return "An error occurred while generating the response.";
    }
}

/**
 * 🔹 API Route Handler
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const userMessage = body.message;
        console.log("🔹 Received User Query:", userMessage);

        const filters = await timeoutAfter(10000, extractClinicFilters(userMessage));
        const searchResults = findAvailableDoctors(filters);

        if (searchResults.error) {
            return new Response(JSON.stringify({ reply: searchResults.error }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const doctorDetails = searchResults.availableOptions.map(d => d.message).join("\n");

        const aiPrompt = `User Query: "${userMessage}". Response: ${doctorDetails}. Generate only a single professional response, ensuring clarity.`;

        const aiResponse = await timeoutAfter(10000, generateResponseWithGemini(aiPrompt));

        return new Response(JSON.stringify({ reply: aiResponse }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("🔴 API Handler Error:", error);
        return new Response(
            JSON.stringify({ error: "An error occurred while processing your request." }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
