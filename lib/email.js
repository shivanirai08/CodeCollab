export async function sendProjectAccessEmail(payload) {
  const webhookUrl =
    process.env.PROJECT_EMAIL_WEBHOOK_URL ||
    process.env.JOIN_REQUEST_WEBHOOK_URL ||
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/project`;

  if (!webhookUrl) {
    return { skipped: true };
  }

  try {
    console.log("[ProjectEmail] Dispatching project access email", {
      event: payload?.event || null,
      projectId: payload?.project?.id || null,
      projectTitle: payload?.project?.title || null,
      ownerEmail: payload?.owner?.email || null,
      requesterEmail: payload?.requester?.email || null,
      joinRequestId: payload?.joinRequest?.id || null,
      webhookUrl,
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseBody = null;

    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText || null;
    }

    console.log("[ProjectEmail] Email webhook response", {
      event: payload?.event || null,
      status: response.status,
      ok: response.ok,
      responseBody,
    });

    if (!response.ok) {
      const errorMessage =
        responseBody?.error ||
        (typeof responseBody === "string" ? responseBody : null) ||
        "Project email webhook returned an error";
      throw new Error(errorMessage);
    }

    return {
      skipped: false,
      ok: true,
      status: response.status,
      responseBody,
    };
  } catch (error) {
    console.warn("Project email webhook failed:", error.message);
    return {
      skipped: false,
      ok: false,
      error,
      errorMessage: error.message,
    };
  }
}
