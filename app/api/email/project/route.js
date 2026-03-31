import nodemailer from "nodemailer";

export const runtime = "nodejs";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function createSmtpTransport() {
  const smtpUser =
    process.env.GMAIL_SMTP_EMAIL ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    "";
  const smtpPass =
    process.env.GMAIL_SMTP_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    "";

  if (!smtpUser || !smtpPass) {
    return {
      transport: null,
      smtpUser,
      smtpPass,
    };
  }

  return {
    transport: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    }),
    smtpUser,
    smtpPass,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toAbsoluteUrl(pathname) {
  return `${baseUrl.replace(/\/$/, "")}/${String(pathname || "").replace(/^\//, "")}`;
}

function ctaButton(label, href, variant = "primary") {
  const safeLabel = escapeHtml(label);
  const safeHref = escapeHtml(href);
  const baseStyle =
    "display:inline-block;padding:12px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;line-height:1.2;";

  if (variant === "danger") {
    return `<a href="${safeHref}" style="${baseStyle}background:#fff1f2;color:#b91c1c;border:1px solid #fecdd3;">${safeLabel}</a>`;
  }

  if (variant === "secondary") {
    return `<a href="${safeHref}" style="${baseStyle}background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1;">${safeLabel}</a>`;
  }

  return `<a href="${safeHref}" style="${baseStyle}background:#2563eb;color:#ffffff;border:1px solid #2563eb;">${safeLabel}</a>`;
}

function renderEmailLayout({ headline, greeting, message, actions = [] }) {
  const buttons = actions.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">${actions.join("")}</div>`
    : "";

  return `
  <div style="background:#f1f5f9;padding:30px 14px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);padding:20px 24px;">
        <div style="font-size:20px;line-height:1.2;font-weight:800;letter-spacing:0.3px;color:#ffffff;">CodeCollab</div>
        <div style="margin-top:6px;font-size:13px;color:#bfdbfe;">Collaborate smarter, ship faster.</div>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#0f172a;">${headline}</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">${message}</p>
        ${buttons}
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;">
        This is an automated notification from CodeCollab.
      </div>
    </div>
  </div>`;
}

function buildEmailPayload({ event, owner, requester, project, joinRequest }) {
  let toEmail = "";
  let subject = "";
  let html = "";

  const projectTitle = escapeHtml(project?.title || "your project");
  const requesterName = escapeHtml(requester?.username || "A user");
  const ownerName = escapeHtml(owner?.username || "there");
  const requesterGreetingName = escapeHtml(requester?.username || "there");
  const accessType = escapeHtml(joinRequest?.accessType || "collaborator");
  const projectUrl = toAbsoluteUrl(`/project/${project?.id || ""}`);
  const dashboardUrl = toAbsoluteUrl("/dashboard");

  if (event === "join_request_created") {
    toEmail = owner?.email || "";
    subject = `New join request for ${project?.title || "your project"}`;

    html = renderEmailLayout({
      headline: "Join Request Received",
      greeting: `Hi ${ownerName},`,
      message: `${requesterName} has requested <strong>${accessType}</strong> access to <strong>${projectTitle}</strong>. You can review the request now from your dashboard.`,
      actions: [ctaButton("View Project", projectUrl, "primary")],
    });
  }

  if (event === "join_request_approved") {
    toEmail = requester?.email || "";
    subject = `Access granted to ${project?.title || "your project"}`;
    html = renderEmailLayout({
      headline: "Request Approved",
      greeting: `Hi ${requesterGreetingName},`,
      message: `Great news! Your request to join <strong>${projectTitle}</strong> has been approved. Click below to review your project.`,
      actions: [ctaButton("Review Project", projectUrl, "primary")],
    });
  }

  if (event === "join_request_rejected") {
    toEmail = requester?.email || "";
    subject = "Request rejected";
    html = renderEmailLayout({
      headline: "Request Declined",
      greeting: `Hi ${requesterGreetingName},`,
      message: `Your request to join <strong>${projectTitle}</strong> was not approved this time. You can check other projects or contact the owner for details.`,
      actions: [ctaButton("Check Your Projects", dashboardUrl, "secondary")],
    });
  }

  return { toEmail, subject, html };
}

export async function POST(req) {
  try {
    const { transport, smtpUser, smtpPass } = createSmtpTransport();

    if (!transport) {
      console.error("[ProjectEmailRoute] Missing Gmail SMTP credentials");
      return Response.json(
        {
          error:
            "Gmail SMTP credentials are not configured. Set GMAIL_SMTP_EMAIL and GMAIL_SMTP_APP_PASSWORD.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { event, owner, requester, project, joinRequest } = body;

    const { toEmail, subject, html } = buildEmailPayload({
      event,
      owner,
      requester,
      project,
      joinRequest,
    });

    console.log("[ProjectEmailRoute] Built email payload", {
      event: event || null,
      projectId: project?.id || null,
      joinRequestId: joinRequest?.id || null,
      smtpSender: smtpUser || null,
      ownerEmail: owner?.email || null,
      requesterEmail: requester?.email || null,
      resolvedRecipient: toEmail || null,
      subject: subject || null,
    });

    if (!toEmail || !subject || !html) {
      console.error("[ProjectEmailRoute] Invalid email payload", {
        event: event || null,
        projectId: project?.id || null,
        joinRequestId: joinRequest?.id || null,
        smtpSender: smtpUser || null,
        ownerEmail: owner?.email || null,
        requesterEmail: requester?.email || null,
        resolvedRecipient: toEmail || null,
      });
      return Response.json(
        { error: "Invalid email payload" },
        { status: 400 }
      );
    }

    const smtpResult = await transport.sendMail({
      from: `CodeCollab <${smtpUser}>`,
      to: toEmail,
      subject,
      html,
    });

    console.log("[ProjectEmailRoute] SMTP send result", {
      event: event || null,
      projectId: project?.id || null,
      joinRequestId: joinRequest?.id || null,
      smtpSender: smtpUser || null,
      resolvedRecipient: toEmail,
      messageId: smtpResult?.messageId || null,
      accepted: smtpResult?.accepted || [],
      rejected: smtpResult?.rejected || [],
      response: smtpResult?.response || null,
    });

    if (Array.isArray(smtpResult?.rejected) && smtpResult.rejected.length > 0) {
      return Response.json(
        { error: `SMTP rejected recipient: ${smtpResult.rejected.join(", ")}` },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      recipient: toEmail,
      messageId: smtpResult?.messageId || null,
    });
  } catch (error) {
    console.error("Project email route failed:", error);
    return Response.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
