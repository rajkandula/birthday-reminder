export type EmailContent = {
  /** How the recipient is addressed, e.g. "Mom" or "Ava". */
  recipientName: string;
  headline: string;
  /** Body paragraphs separated by blank lines. No greeting or sign-off. */
  message: string;
  senderName: string;
  /** Sign-off block, e.g. "With love,\nJordan". */
  signature: string;
  replyEmail: string;
  /** Age they are turning, only when it is appropriate to show it. */
  turning: number | null;
};

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',Times,serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function text(opts: {
  size: number;
  color: string;
  weight?: number;
  lineHeight?: number;
  family?: string;
  extra?: string;
}): string {
  return [
    `font-family:${opts.family ?? SANS}`,
    `font-size:${opts.size}px`,
    `font-weight:${opts.weight ?? 400}`,
    `line-height:${opts.lineHeight ?? 1.6}`,
    `color:${opts.color}`,
    opts.extra ?? "",
  ]
    .filter(Boolean)
    .join(";");
}

export function paragraphs(message: string, style: string): string {
  return message
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 18px;${style}">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function signatureLines(content: EmailContent): string[] {
  const sig = content.signature.trim() || `Warmly,\n${content.senderName}`;
  return sig.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function signature(content: EmailContent, style: string, nameStyle: string): string {
  const lines = signatureLines(content);
  const last = lines.length > 1 ? lines.pop()! : null;
  const head = lines.map((l) => escapeHtml(l)).join("<br>");
  return `<p style="margin:8px 0 0;${style}">${head}${
    last ? `<br><span style="${nameStyle}">${escapeHtml(last)}</span>` : ""
  }</p>`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function replyHref(content: EmailContent): string {
  const subject = encodeURIComponent("Thank you!");
  return `mailto:${encodeURIComponent(content.replyEmail).replace(/%40/g, "@")}?subject=${subject}`;
}

export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function documentShell(opts: { title: string; preheader: string; background: string; body: string }): string {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(opts.title)}</title>
<style>
  @media (max-width:620px){ .px{padding-left:24px!important;padding-right:24px!important} .h1{font-size:32px!important} }
  a{color:inherit}
</style>
</head>
<body style="margin:0;padding:0;background:${opts.background};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${opts.background};">
<tr><td align="center" style="padding:32px 12px;">
${opts.body}
</td></tr>
</table>
</body>
</html>`;
}

export function renderPlainText(content: EmailContent): string {
  return [
    `Hi ${content.recipientName},`,
    "",
    content.headline,
    "",
    content.message.trim(),
    "",
    signatureLines(content).join("\n"),
    "",
    content.replyEmail ? `Reply: ${content.replyEmail}` : "",
  ]
    .join("\n")
    .trim();
}
