import clinicData from "../../../data/clinic_appointments.json";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 🔹 Convert Date (YYYY-MM-DD) to Day of the Week
 */
function getDayFromDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Saturday"
}

/**
 * 🔹 Extract structured details from user query (Gemini handles spelling mistakes)
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
        let textResponse = response.response.candidates[0].content.parts[0].text;

        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        console.log("🟢 Extracted Filters:", textResponse);

        return JSON.parse(textResponse || "{}");

    } catch (error) {
        console.error("🔴 Gemini Extraction Error:", error);
        return {};
    }
}

/**
 * 🔹 Find available doctors & recommend best time slot (1-hour slots)
 */
function findAvailableDoctors(filters) {
    console.log("🟢 Filters received for doctor search:", filters);

    let { doctor_name, specialization, date, time } = filters;

    // Convert date to day of the week (only if date is provided)
    let dayOfWeek = date ? getDayFromDate(date) : null;
    console.log("🟢 Converted Date to Day:", dayOfWeek);

    // Ensure time is properly formatted before using it
    let requestedTime = null;
    if (time && /^\d{1,2}:\d{2}$/.test(time.trim())) {
        requestedTime = parseInt(time.split(":")[0]);
    }

    // Filter doctors based on provided criteria
    let matchingDoctors = clinicData.filter(doctor => {
        let availabilityObject = JSON.parse(doctor.availability.replace(/'/g, '"')); // Parse JSON once

        // Apply filters dynamically (skip null values)
        if (doctor_name && !doctor.name.toLowerCase().includes(doctor_name.toLowerCase())) return false;
        if (specialization && doctor.specialization.toLowerCase() !== specialization.toLowerCase()) return false;
        if (dayOfWeek && !(dayOfWeek in availabilityObject)) return false; // Exclude if unavailable on the given day

        if (requestedTime !== null && dayOfWeek) {
            let availableSlots = availabilityObject[dayOfWeek] || [];
            let isTimeAvailable = availableSlots.some(slot => {
                let [start, end] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                return requestedTime >= start && requestedTime < end;
            });

            if (!isTimeAvailable) return false; // Exclude if requested time is unavailable
        }

        return true;
    });

    if (matchingDoctors.length === 0) {
        console.log("❌ No doctors matched the given filters.");
        return { error: "No doctors available for the requested criteria." };
    }

    console.log(`🟢 Found ${matchingDoctors.length} doctor(s) matching filters:`, matchingDoctors.map(d => d.name));

    // Process available options
    let availableOptions = matchingDoctors.map(doctor => {
        console.log(`🔹 Checking availability for Dr. ${doctor.name}...`);

        let availabilityObject = JSON.parse(doctor.availability.replace(/'/g, '"')); // Reusing parsed JSON
        let originalSlots = dayOfWeek && availabilityObject[dayOfWeek] ? availabilityObject[dayOfWeek] : [];

        console.log(`🟢 Original Available Slots on ${dayOfWeek || "N/A"}:`, originalSlots);

        let splitSlots = [];
        let availableMessage = "";
        let suggestions = [];

        // Process time slots only if date is provided
        if (dayOfWeek && originalSlots.length > 0) {
            originalSlots.forEach(slot => {
                let [slotStart, slotEnd] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                for (let i = slotStart; i < slotEnd; i++) {
                    splitSlots.push(`${i}:00-${i + 1}:00`);
                }
            });

            console.log("🟢 Adjusted 1-Hour Time Slots:", splitSlots);
        }

        // If time is provided, check for availability
        if (requestedTime !== null && splitSlots.length > 0) {
            console.log("🟢 User Requested Time:", requestedTime);

            let matchingSlot = splitSlots.find(slot => {
                let [slotStart, slotEnd] = slot.split("-").map(t => parseInt(t.split(":")[0]));
                return requestedTime >= slotStart && requestedTime < slotEnd;
            });

            if (matchingSlot) {
                availableMessage = `✅ Dr. ${doctor.name} is available at ${matchingSlot} on ${dayOfWeek}, ${date}. Would you like to book this slot?`;
                console.log("🟢 Matching Slot Found:", matchingSlot);
            } else {
                console.log("❌ Requested time does not match any available slots.");

                // Suggest nearest available slot
                let nearestSlot = splitSlots.find(slot => requestedTime < parseInt(slot.split("-")[0]));
                if (nearestSlot) {
                    suggestions.push(`❌ Dr. ${doctor.name} is **not available** at ${time} on ${dayOfWeek}. Nearest available slot: **${nearestSlot}**.`);
                    console.log("🟢 Suggesting Nearest Slot:", nearestSlot);
                } else {
                    console.log("❌ No close slot found on this day.");
                    suggestions.push(`❌ No available slots at ${time} on ${dayOfWeek}.`);
                }
            }
        } else if (dayOfWeek && splitSlots.length > 0) {
            availableMessage = `✅ Dr. ${doctor.name} is available on ${dayOfWeek}, ${date} at the following times: **${splitSlots.join(", ")}**.`;
            console.log("🟢 Doctor is available on this day:", splitSlots);
        } else if (dayOfWeek) {
            console.log(`❌ Dr. ${doctor.name} is **not available** on ${dayOfWeek}.`);
            suggestions.push(`❌ No available slots on ${dayOfWeek}.`);
        } else {
            availableMessage = `✅ Dr. ${doctor.name} is available. Consultation fee: **₹${doctor.consultation_fee.toFixed(2)}**.`;
        }

        return {
            doctor: doctor.name,
            specialization: doctor.specialization,
            available_days: Object.keys(availabilityObject), // List of available days
            message: availableMessage || suggestions.join(" "),
            consultation_fee: doctor.consultation_fee,
            rating: doctor.rating
        };
    });

    // Sort by rating (highest first)
    availableOptions.sort((a, b) => b.rating - a.rating);

    console.log("🟢 Final Available Options:", availableOptions);
    return { availableOptions };
}


/**
 * 🔹 Generate AI response using Gemini
 */
async function generateResponseWithGemini(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent(prompt);
        let aiResponse = response.response.candidates[0].content.parts[0].text;
        console.log("🟢 AI Generated Response:", aiResponse);
        return aiResponse;
    } catch (error) {
        console.error("🔴 Gemini API Error:", error);
        return "An error occurred while generating the response.";
    }
}

/**
 * 🔹 Main API handler
 */
// export default async function handler(req, res) {
//     let userMessage = req.body.message;
//     console.log("🔹 Received User Query:", userMessage);

//     let filters = await extractClinicFilters(userMessage);
//     let searchResults = findAvailableDoctors(filters);

//     if (searchResults.error) {
//         return res.status(200).json({ reply: searchResults.error });
//     }

//     console.log("🟢 Available Appointment Options:", searchResults.availableOptions);

//     let doctorDetails = searchResults.availableOptions.map(d => `${d.message}`).join("\n");

//     const aiPrompt = `User Query: "${userMessage}". Response: ${doctorDetails}. Generate only a single professional response, ensuring clarity.`;

//     let aiResponse = await generateResponseWithGemini(aiPrompt);

//     return res.status(200).json({ reply: aiResponse });
// }

export async function POST(req) {
    try {
        const body = await req.json();
        let userMessage = body.message;
        console.log("🔹 Received User Query:", userMessage);

        let filters = await extractClinicFilters(userMessage);
        let searchResults = findAvailableDoctors(filters);

        if (searchResults.error) {
            return new Response(JSON.stringify({ reply: searchResults.error }), { status: 200 });
        }

        console.log("🟢 Available Appointment Options:", searchResults.availableOptions);

        let doctorDetails = searchResults.availableOptions.map(d => `${d.message}`).join("\n");

        const aiPrompt = `User Query: "${userMessage}". Response: ${doctorDetails}. Generate only a single professional response, ensuring clarity.`;

        let aiResponse = await generateResponseWithGemini(aiPrompt);

        return new Response(JSON.stringify({ reply: aiResponse }), { status: 200 });
    } catch (error) {
        console.error("🔴 API Error:", error);
        return new Response(JSON.stringify({ error: "An error occurred while processing your request." }), { status: 500 });
    }
}