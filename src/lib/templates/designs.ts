import {
  type EmailContent,
  SANS,
  SERIF,
  documentShell,
  escapeHtml,
  firstName,
  ordinalSuffix,
  paragraphs,
  replyHref,
  signature,
  text,
} from "./shared";

const card = (bg: string, extra = "") =>
  `role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${bg};${extra}"`;

function replyButton(content: EmailContent, bg: string, color: string, radius = 999, family = SANS): string {
  if (!content.replyEmail) return "";
  return `<a href="${replyHref(content)}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;${text({
    size: 15,
    weight: 600,
    color,
    family,
    lineHeight: 1,
  })};padding:15px 30px;border-radius:${radius}px;">Reply to ${escapeHtml(firstName(content.senderName))}</a>`;
}

function preheader(content: EmailContent): string {
  return `${content.headline} — a note from ${content.senderName}`;
}

/* 1. Confetti Pop — bold, marketing-style celebration */
export function confetti(content: EmailContent): string {
  const dots = ["#FDE68A", "#FFFFFF", "#A5F3FC", "#FBCFE8", "#FDE68A", "#FFFFFF", "#BBF7D0"]
    .map((c, i) => `<span style="color:${c};font-size:${i % 2 ? 10 : 16}px;padding:0 6px;">&#9679;</span>`)
    .join("");
  const badge = content.turning
    ? `<div style="margin-top:18px;"><span style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.45);border-radius:999px;padding:8px 16px;${text(
        { size: 13, weight: 700, color: "#FFFFFF", lineHeight: 1, extra: "letter-spacing:1px" },
      )}">HAPPY ${ordinalSuffix(content.turning).toUpperCase()}</span></div>`
    : "";
  const body = `
<table ${card("#FFFFFF", "border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(244,63,94,0.18);")}>
  <tr><td class="px" bgcolor="#F43F5E" align="center" style="background:#F43F5E;background-image:linear-gradient(135deg,#F43F5E 0%,#FB7185 45%,#FB923C 100%);padding:44px 40px 44px;">
    <div>${dots}</div>
    <div style="font-size:60px;line-height:1;margin:18px 0 14px;">&#127881;</div>
    <div style="${text({ size: 13, weight: 700, color: "#FFE4E6", lineHeight: 1, extra: "letter-spacing:4px;text-transform:uppercase" })}">It's your day</div>
    <h1 class="h1" style="margin:14px 0 0;${text({ size: 40, weight: 800, color: "#FFFFFF", lineHeight: 1.12, extra: "letter-spacing:-0.5px" })}">${escapeHtml(content.headline)}</h1>
    ${badge}
  </td></tr>
  <tr><td class="px" style="padding:40px 48px 8px;">
    <p style="margin:0 0 18px;${text({ size: 18, weight: 700, color: "#18181B" })}">Hi ${escapeHtml(content.recipientName)},</p>
    ${paragraphs(content.message, text({ size: 17, color: "#3F3F46", lineHeight: 1.7 }))}
    ${signature(content, text({ size: 17, color: "#3F3F46", lineHeight: 1.6 }), text({ size: 17, weight: 700, color: "#E11D48" }))}
  </td></tr>
  <tr><td class="px" align="center" style="padding:28px 48px 44px;">${replyButton(content, "#18181B", "#FFFFFF")}</td></tr>
</table>
<p style="margin:22px 0 0;${text({ size: 12, color: "#BE7C8A" })}">Sent with love by ${escapeHtml(content.senderName)}</p>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#FFF1F2", body });
}

/* 2. Midnight Gold — premium, elegant, serif */
export function midnight(content: EmailContent): string {
  const gold = "#E7C27D";
  const badge = content.turning
    ? `<div style="margin-top:14px;${text({ size: 14, color: gold, family: SERIF, extra: "font-style:italic" })}">${ordinalSuffix(content.turning)} chapter</div>`
    : "";
  const body = `
<table ${card("#0F1530", `border:1px solid #2A3360;border-radius:6px;`)}>
  <tr><td style="padding:10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(231,194,125,0.35);">
      <tr><td class="px" align="center" style="padding:52px 48px 34px;">
        <div style="${text({ size: 12, weight: 600, color: gold, lineHeight: 1, extra: "letter-spacing:6px;text-transform:uppercase" })}">&#10022; &nbsp;Celebrating you&nbsp; &#10022;</div>
        <h1 class="h1" style="margin:22px 0 0;${text({ size: 44, weight: 400, color: "#FFFFFF", lineHeight: 1.1, family: SERIF, extra: "font-style:italic" })}">${escapeHtml(content.headline)}</h1>
        ${badge}
        <div style="margin:28px auto 0;width:72px;height:1px;background:${gold};line-height:1px;font-size:1px;">&nbsp;</div>
      </td></tr>
      <tr><td class="px" style="padding:6px 56px 12px;">
        <p style="margin:0 0 18px;${text({ size: 18, color: "#FFFFFF", family: SERIF })}">Dear ${escapeHtml(content.recipientName)},</p>
        ${paragraphs(content.message, text({ size: 17, color: "#C9CDE0", lineHeight: 1.75, family: SERIF }))}
        ${signature(content, text({ size: 17, color: "#C9CDE0", family: SERIF }), text({ size: 20, color: gold, family: SERIF, extra: "font-style:italic" }))}
      </td></tr>
      <tr><td class="px" align="center" style="padding:30px 56px 52px;">${replyButton(content, gold, "#0F1530", 2, SERIF)}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:22px 0 0;${text({ size: 12, color: "#6B7196" })}">With warm wishes from ${escapeHtml(content.senderName)}</p>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#080B1A", body });
}

/* 3. Clean Professional — for colleagues and clients */
export function minimal(content: EmailContent): string {
  const accent = "#2563EB";
  const body = `
<table ${card("#FFFFFF", "border-radius:12px;overflow:hidden;border:1px solid #E4E4E7;")}>
  <tr><td style="height:5px;background:${accent};line-height:5px;font-size:5px;">&nbsp;</td></tr>
  <tr><td class="px" style="padding:44px 52px 10px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="width:44px;height:44px;background:#EFF6FF;border-radius:10px;text-align:center;font-size:22px;line-height:44px;">&#127874;</td>
      <td style="padding-left:14px;${text({ size: 12, weight: 700, color: "#71717A", lineHeight: 1.2, extra: "letter-spacing:2px;text-transform:uppercase" })}">Birthday greetings</td>
    </tr></table>
    <h1 class="h1" style="margin:28px 0 22px;${text({ size: 32, weight: 700, color: "#09090B", lineHeight: 1.2, extra: "letter-spacing:-0.4px" })}">${escapeHtml(content.headline)}</h1>
    <p style="margin:0 0 18px;${text({ size: 16, color: "#27272A" })}">Dear ${escapeHtml(content.recipientName)},</p>
    ${paragraphs(content.message, text({ size: 16, color: "#3F3F46", lineHeight: 1.7 }))}
  </td></tr>
  <tr><td class="px" style="padding:8px 52px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E4E4E7;"><tr><td style="padding-top:22px;">
      ${signature(content, text({ size: 15, color: "#52525B" }), text({ size: 16, weight: 700, color: "#09090B" }))}
      ${content.replyEmail ? `<p style="margin:10px 0 0;${text({ size: 14, color: accent })}"><a href="${replyHref(content)}" style="color:${accent};text-decoration:none;">${escapeHtml(content.replyEmail)}</a></p>` : ""}
    </td></tr></table>
  </td></tr>
</table>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#F4F4F5", body });
}

/* 4. Warm Sunrise — heartfelt, great for family */
export function sunrise(content: EmailContent): string {
  const badge = content.turning
    ? `<p style="margin:12px 0 0;${text({ size: 15, weight: 600, color: "#9A3412" })}">Here's to ${content.turning} beautiful years</p>`
    : "";
  const body = `
<table ${card("#FFFBF5", "border-radius:32px;overflow:hidden;border:1px solid #FED7AA;")}>
  <tr><td class="px" bgcolor="#FDBA74" align="center" style="background:#FDBA74;background-image:linear-gradient(180deg,#FB923C 0%,#FDBA74 55%,#FEF3C7 100%);padding:48px 40px 56px;">
    <div style="font-size:64px;line-height:1;">&#127874;</div>
    <h1 class="h1" style="margin:20px 0 0;${text({ size: 40, weight: 400, color: "#431407", lineHeight: 1.15, family: SERIF })}">${escapeHtml(content.headline)}</h1>
    ${badge}
  </td></tr>
  <tr><td class="px" style="padding:36px 52px 8px;">
    <p style="margin:0 0 18px;${text({ size: 20, color: "#7C2D12", family: SERIF, extra: "font-style:italic" })}">My dear ${escapeHtml(content.recipientName)},</p>
    ${paragraphs(content.message, text({ size: 17, color: "#44403C", lineHeight: 1.75 }))}
    ${signature(content, text({ size: 17, color: "#57534E" }), text({ size: 22, color: "#C2410C", family: SERIF, extra: "font-style:italic" }))}
  </td></tr>
  <tr><td class="px" align="center" style="padding:30px 52px 48px;">${replyButton(content, "#EA580C", "#FFFFFF")}</td></tr>
</table>
<p style="margin:22px 0 0;${text({ size: 12, color: "#B08968" })}">Sent with love by ${escapeHtml(content.senderName)}</p>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#FFF3E6", body });
}

/* 5. Neon Party — loud and fun for friends */
export function neon(content: EmailContent): string {
  const pink = "#FF4FD8";
  const cyan = "#22D3EE";
  const badge = content.turning
    ? `<span style="display:inline-block;margin-top:18px;border:2px solid ${cyan};border-radius:999px;padding:8px 18px;${text({ size: 14, weight: 800, color: cyan, lineHeight: 1, extra: "letter-spacing:2px" })}">LEVEL ${content.turning} UNLOCKED</span>`
    : "";
  const body = `
<table ${card("#12121C", `border-radius:24px;overflow:hidden;border:1px solid #2B2B40;`)}>
  <tr><td class="px" align="center" style="padding:52px 40px 30px;background:#12121C;background-image:radial-gradient(circle at 20% 0%,rgba(255,79,216,0.35),transparent 55%),radial-gradient(circle at 90% 30%,rgba(34,211,238,0.28),transparent 50%);">
    <div style="font-size:54px;line-height:1;">&#129395;</div>
    <div style="margin-top:18px;${text({ size: 13, weight: 800, color: cyan, lineHeight: 1, extra: "letter-spacing:5px;text-transform:uppercase" })}">Party mode: on</div>
    <h1 class="h1" style="margin:14px 0 0;${text({ size: 42, weight: 900, color: "#FFFFFF", lineHeight: 1.1, extra: `letter-spacing:-0.5px;text-shadow:0 0 18px ${pink}` })}">${escapeHtml(content.headline)}</h1>
    ${badge}
  </td></tr>
  <tr><td class="px" style="padding:26px 48px 8px;">
    <p style="margin:0 0 18px;${text({ size: 18, weight: 700, color: pink })}">Hey ${escapeHtml(content.recipientName)}!</p>
    ${paragraphs(content.message, text({ size: 17, color: "#D4D4E0", lineHeight: 1.7 }))}
    ${signature(content, text({ size: 17, color: "#D4D4E0" }), text({ size: 18, weight: 800, color: cyan }))}
  </td></tr>
  <tr><td class="px" align="center" style="padding:30px 48px 48px;">${replyButton(content, pink, "#12121C")}</td></tr>
</table>
<p style="margin:22px 0 0;${text({ size: 12, color: "#6E6E8A" })}">Sent with good vibes by ${escapeHtml(content.senderName)}</p>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#07070D", body });
}

/* 6. Botanical — calm, soft and thoughtful */
export function garden(content: EmailContent): string {
  const green = "#166534";
  const badge = content.turning
    ? `<p style="margin:10px 0 0;${text({ size: 15, color: "#15803D", family: SERIF, extra: "font-style:italic" })}">Blooming at ${content.turning}</p>`
    : "";
  const body = `
<table ${card("#FFFFFF", "border-radius:20px;overflow:hidden;border:1px solid #D9F99D;")}>
  <tr><td class="px" align="center" style="padding:46px 44px 26px;background:#F7FEE7;">
    <div style="font-size:30px;line-height:1;letter-spacing:10px;">&#127807;&#127800;&#127807;</div>
    <h1 class="h1" style="margin:20px 0 0;${text({ size: 38, weight: 400, color: green, lineHeight: 1.15, family: SERIF })}">${escapeHtml(content.headline)}</h1>
    ${badge}
  </td></tr>
  <tr><td class="px" style="padding:34px 52px 8px;">
    <p style="margin:0 0 18px;${text({ size: 18, color: "#14532D", family: SERIF })}">Dear ${escapeHtml(content.recipientName)},</p>
    ${paragraphs(content.message, text({ size: 17, color: "#3F4A3F", lineHeight: 1.75 }))}
    ${signature(content, text({ size: 17, color: "#4B5A4B" }), text({ size: 19, color: green, family: SERIF, extra: "font-style:italic" }))}
  </td></tr>
  <tr><td class="px" align="center" style="padding:28px 52px 46px;">${replyButton(content, green, "#FFFFFF", 12)}</td></tr>
</table>
<p style="margin:22px 0 0;${text({ size: 12, color: "#7C9A7C" })}">With warm wishes from ${escapeHtml(content.senderName)}</p>`;
  return documentShell({ title: content.headline, preheader: preheader(content), background: "#ECFCCB", body });
}
