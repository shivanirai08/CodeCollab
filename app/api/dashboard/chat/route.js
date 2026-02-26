import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to limit text to 200 words
function limitTo200Words(text) {
  const words = text.split(/\s+/);
  if (words.length > 200) {
    return words.slice(0, 200).join(" ") + "...";
  }
  return text;
}

// Check if error is a quota/rate limit error
function isQuotaExceededError(error) {
  const errorMessage = error?.message || "";
  return (
    errorMessage.includes("429") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("Too Many Requests") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("RESOURCE_EXHAUSTED")
  );
}

async function generateContentWithFallback(message) {
  const primaryModel = "gemini-2.5-flash-lite";
  const fallbackModel = "gemma-3-4b";

  try {
    // Try primary model
    const model = genAI.getGenerativeModel({
      model: primaryModel,
      systemInstruction: `
        You are a professional assistant.
        - If user asks illegal or harmful things, politely refuse.
        - If question is unclear, ask for clarification.
        - If request is not feasible, reply:
          "I'm unable to help with that request."
        - Keep responses concise and well formatted using markdown when appropriate.
      `
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (primaryError) {
    // Check if it's a quota error
    if (isQuotaExceededError(primaryError)) {
      console.warn(`Primary model (${primaryModel}) quota exceeded, switching to fallback model (${fallbackModel})`);
      
      try {
        // Try fallback model
        const fallbackModelObj = genAI.getGenerativeModel({
          model: fallbackModel,
          systemInstruction: `
            You are a professional assistant.
            - If user asks illegal or harmful things, politely refuse.
            - If question is unclear, ask for clarification.
            - If request is not feasible, reply:
              "I'm unable to help with that request."
            - Keep responses concise and well formatted using markdown when appropriate.
          `
        });

        const fallbackResult = await fallbackModelObj.generateContent(message);
        const fallbackResponse = await fallbackResult.response;
        return fallbackResponse.text();
      } catch (fallbackError) {
        console.error(`Fallback model (${fallbackModel}) also failed:`, fallbackError);
        throw new Error(`Both primary and fallback models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
      }
    } else {
      // If it's not a quota error, throw immediately
      throw primaryError;
    }
  }
}

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const textContent = await generateContentWithFallback(message);
    const limitedContent = limitTo200Words(textContent);

    return Response.json({
      reply: limitedContent,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}