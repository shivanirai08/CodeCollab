export async function sendProjectAccessEmail(payload) {
  const webhookUrl =
    process.env.PROJECT_EMAIL_WEBHOOK_URL ||
    process.env.JOIN_REQUEST_WEBHOOK_URL ||
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/project`;

  if (!webhookUrl) {
    return { skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Project email webhook returned an error");
    }

    return { skipped: false };
  } catch (error) {
    console.warn("Project email webhook failed:", error.message);
    return { skipped: false, error };
  }
}
