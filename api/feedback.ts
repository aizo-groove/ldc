import type { VercelRequest, VercelResponse } from "@vercel/node";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO  = process.env.GITHUB_REPO!; // "owner/repo"

const CATEGORY_LABELS: Record<string, string> = {
  bug:        "bug",
  suggestion: "enhancement",
  autre:      "feedback",
};

const CATEGORY_TITLES: Record<string, string> = {
  bug:        "🐛 Bug",
  suggestion: "💡 Suggestion",
  autre:      "💬 Retour",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { category = "autre", message, version = "?" } = req.body ?? {};

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return res.status(400).json({ error: "Message trop court" });
  }

  const label   = CATEGORY_LABELS[category] ?? "feedback";
  const prefix  = CATEGORY_TITLES[category]  ?? "💬 Retour";
  const excerpt = message.trim().slice(0, 72);
  const title   = `${prefix}: ${excerpt}${message.length > 72 ? "…" : ""}`;

  const body = [
    `**Version :** \`${version}\``,
    `**Catégorie :** ${category}`,
    "",
    "---",
    "",
    message.trim(),
  ].join("\n");

  const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept:         "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body, labels: [label] }),
  });

  if (!ghRes.ok) {
    const text = await ghRes.text();
    console.error("GitHub API error:", ghRes.status, text);
    return res.status(502).json({ error: "Impossible de créer l'issue GitHub" });
  }

  const issue = await ghRes.json() as { number: number; html_url: string };
  return res.status(200).json({ issue: issue.number, url: issue.html_url });
}
