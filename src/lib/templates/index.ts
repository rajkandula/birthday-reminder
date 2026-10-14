import { confetti, garden, midnight, minimal, neon, sunrise } from "./designs";
import { type EmailContent, renderPlainText } from "./shared";

export type { EmailContent } from "./shared";

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  swatches: [string, string, string];
  render: (content: EmailContent) => string;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "confetti",
    name: "Confetti Pop",
    description: "Bold gradient header, confetti and a big celebratory headline.",
    bestFor: "Friends & anyone who loves a party",
    swatches: ["#F43F5E", "#FB923C", "#FFF1F2"],
    render: confetti,
  },
  {
    id: "midnight",
    name: "Midnight Gold",
    description: "Deep navy with gold accents and elegant serif type.",
    bestFor: "Partners, mentors, special people",
    swatches: ["#0F1530", "#E7C27D", "#C9CDE0"],
    render: midnight,
  },
  {
    id: "minimal",
    name: "Clean Professional",
    description: "Crisp, understated layout with a signature block.",
    bestFor: "Colleagues, managers & clients",
    swatches: ["#2563EB", "#09090B", "#F4F4F5"],
    render: minimal,
  },
  {
    id: "sunrise",
    name: "Warm Sunrise",
    description: "Soft sunrise gradient and a heartfelt handwritten feel.",
    bestFor: "Parents, grandparents & family",
    swatches: ["#FB923C", "#FEF3C7", "#7C2D12"],
    render: sunrise,
  },
  {
    id: "neon",
    name: "Neon Party",
    description: "Dark mode glow with neon pink and cyan energy.",
    bestFor: "Best friends & siblings",
    swatches: ["#FF4FD8", "#22D3EE", "#12121C"],
    render: neon,
  },
  {
    id: "garden",
    name: "Botanical",
    description: "Calm greens, florals and gentle serif typography.",
    bestFor: "Thoughtful, calm wishes",
    swatches: ["#166534", "#D9F99D", "#F7FEE7"],
    render: garden,
  },
];

export const DEFAULT_TEMPLATE = "confetti";

export function getTemplate(id: string | null | undefined): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE)!;
}

export function renderEmail(templateId: string | null | undefined, content: EmailContent) {
  const template = getTemplate(templateId);
  return { templateId: template.id, html: template.render(content), text: renderPlainText(content) };
}

export const SAMPLE_CONTENT: EmailContent = {
  recipientName: "Alex",
  headline: "Happy Birthday, Alex!",
  message:
    "Another trip around the sun, and you make it look effortless. I hope today is packed with good food, great people and at least one moment where you stop and realise how loved you are.\n\nThank you for being the kind of friend who shows up. Here's to a year full of adventures, big wins and plenty of laughs.",
  senderName: "Jordan",
  signature: "Cheers to you,\nJordan",
  replyEmail: "jordan@example.com",
  turning: 30,
};
