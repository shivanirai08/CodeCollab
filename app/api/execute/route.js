import { NextResponse } from "next/server";
import axios from "axios";

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com";
const RAPID_API_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPID_API_HOST = "judge0-ce.p.rapidapi.com";

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

export async function POST(req) {
  try {
    const { sourceCode, language, stdin } = await req.json();

    if (!sourceCode) {
      return NextResponse.json(
        { error: "Source code is required" },
        { status: 400 }
      );
    }

    const languageId =
      LANGUAGE_IDS[language?.toLowerCase()] || LANGUAGE_IDS.javascript;

    // Submit code
    const submitResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions`,
      {
        language_id: languageId,
        source_code: sourceCode,
        stdin: stdin || "",
      },
      {
        params: { base64_encoded: "false", wait: "false" },
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": RAPID_API_HOST,
        },
      }
    );

    const token = submitResponse?.data?.token;
    if (!token) {
      throw new Error("Failed to receive execution token from Judge0");
    }

    // Poll for results
    let result = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await axios.get(`${JUDGE0_API_URL}/submissions/${token}`, {
        params: { base64_encoded: "false", fields: "*" },
        headers: {
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": RAPID_API_HOST,
        },
      });

      result = res.data;
      if (result.status?.id >= 3) break; // finished
    }

    // Handle possible error cases
    let output = "";
    let error = "";
    const statusDesc = result?.status?.description || "Unknown";

    if (result?.compile_output) {
      error = result.compile_output.trim();
    } else if (result?.stderr) {
      error = result.stderr.trim();
    } else if (result?.message) {
      error = result.message.trim();
    } else if (result?.stdout) {
      output = result.stdout.trim();
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
