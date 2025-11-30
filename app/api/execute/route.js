import { NextResponse } from "next/server";
import axios from "axios";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com";
const RAPID_API_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPID_API_HOST = "judge0-ce.p.rapidapi.com";

// Rate limiter: 20 code executions per 5 minutes per IP
const limiter = rateLimit({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 100
});

// Language ID mapping
const LANGUAGE_IDS = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
  go: 60,
  rust: 73,
  php: 68,
  ruby: 72,
  kotlin: 78,
  swift: 83,
  sql: 82,
  bash: 46,
  r: 80,
  plaintext: 63,
};

// Helper function to encode to base64
function encodeBase64(str) {
  return Buffer.from(str).toString("base64");
}

// Helper function to decode from base64
function decodeBase64(str) {
  if (!str) return "";
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch (e) {
    return str; // Return as-is if decoding fails
  }
}

export async function POST(req) {
  // Apply aggressive rate limiting for code execution
  const ip = getClientIp(req);
  try {
    await limiter.check(20, ip);
  } catch (error) {
    return NextResponse.json(
      { error: 'Too many code executions. Please try again later.', retryAfter: error.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': error.retryAfter?.toString() || '300',
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  try {
    const { sourceCode, language, stdin } = await req.json();

    if (!sourceCode) {
      return NextResponse.json(
        { error: "Source code is required" },
        { status: 400 }
      );
    }

    // Validate API key
    if (!RAPID_API_KEY) {
      console.error("NEXT_PUBLIC_RAPIDAPI_KEY is not configured");
      return NextResponse.json(
        { error: "Code execution service is not configured" },
        { status: 503 }
      );
    }

    const languageId =
      LANGUAGE_IDS[language?.toLowerCase()] || LANGUAGE_IDS.javascript;

    // Encode source code and stdin to base64
    const encodedSourceCode = encodeBase64(sourceCode);
    const encodedStdin = stdin ? encodeBase64(stdin) : "";

    // Submit code with base64 encoding
    let submitResponse;
    try {
      submitResponse = await axios.post(
        `${JUDGE0_API_URL}/submissions`,
        {
          language_id: languageId,
          source_code: encodedSourceCode,
          stdin: encodedStdin,
        },
        {
          params: { base64_encoded: "true", wait: "false" },
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": RAPID_API_KEY,
            "X-RapidAPI-Host": RAPID_API_HOST,
          },
        }
      );
    } catch (apiError) {
      console.error("Judge0 Submission Error:", apiError.response?.data || apiError.message);
      return NextResponse.json(
        {
          success: false,
          output: "",
          error: apiError.response?.data?.error || "Failed to submit code for execution",
          status: "Error",
        },
        { status: 500 }
      );
    }

    const token = submitResponse?.data?.token;
    if (!token) {
      console.error("No token received from Judge0:", submitResponse?.data);
      return NextResponse.json(
        {
          success: false,
          output: "",
          error: "Failed to receive execution token from Judge0",
          status: "Error",
        },
        { status: 500 }
      );
    }

    // Poll for results with base64 encoding
    let result = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      
      try {
        const res = await axios.get(`${JUDGE0_API_URL}/submissions/${token}`, {
          params: { base64_encoded: "true", fields: "*" },
          headers: {
            "X-RapidAPI-Key": RAPID_API_KEY,
            "X-RapidAPI-Host": RAPID_API_HOST,
          },
        });

        result = res.data;
        if (result.status?.id >= 3) break; // status id 3+ == execution is complete
      } catch (pollError) {
        console.error(`Judge0 Polling Error (attempt ${i + 1}):`, pollError.response?.data || pollError.message);
        if (i === 14) { // Last attempt
          return NextResponse.json(
            {
              success: false,
              output: "",
              error: "Failed to retrieve execution results",
              status: "Error",
            },
            { status: 500 }
          );
        }
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          output: "",
          error: "Execution timed out",
          status: "Timeout",
        },
        { status: 408 }
      );
    }

    // Decode all outputs from base64
    const stdout = decodeBase64(result?.stdout);
    const stderr = decodeBase64(result?.stderr);
    const compileOutput = decodeBase64(result?.compile_output);
    const message = result?.message || "";

    // Handle possible error cases
    let output = "";
    let error = "";
    const statusDesc = result?.status?.description || "Unknown";

    // Priority: compile errors > runtime errors > stderr > stdout
    if (compileOutput) {
      error = compileOutput.trim();
    } else if (stderr) {
      error = stderr.trim();
    } else if (message && result?.status?.id !== 3) {
      error = message.trim();
    } else if (stdout) {
      output = stdout.trim();
    } else {
      output = "No output.";
    }

    return NextResponse.json({
      success: !error,
      output,
      error,
      status: statusDesc,
      time: result?.time,
      memory: result?.memory,
    });
  } catch (err) {
    console.error("Judge0 Execution Error:", err);
    console.error("Error stack:", err.stack);

    return NextResponse.json(
      {
        success: false,
        output: "",
        error:
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unknown execution error.",
        status: "Error",
      },
      { status: 500 }
    );
  }
}
