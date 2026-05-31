import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateRoastBody } from "@workspace/api-zod";

const router = Router();

const ROAST_STYLE_PROMPTS: Record<string, string> = {
  Normal: "You are a brutally honest, witty comedian. Roast this GitHub user based on their repos. Be funny but not mean-spirited. Use casual language.",
  "Corporate Jargon": "You are a parody corporate executive. Roast this GitHub user using excessive buzzwords, synergy, blue-sky thinking, circle back, leverage, pivot, and corporate jargon. Make it absurd.",
  Pirate: "Arr! You be a salty pirate captain. Roast this GitHub user in pirate speak — use 'arr', 'matey', 'shiver me timbers', 'Davy Jones', etc. Make it funny and nautical.",
  Haiku: "You are a haiku master. Write a roast of this GitHub user ONLY as a series of haikus (5-7-5 syllables each). Write 3 haikus. Be clever and funny.",
};

router.post("/roast", async (req, res) => {
  const parseResult = GenerateRoastBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, style } = parseResult.data;

  const githubRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
    {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "RoastMyGitHub/1.0",
      },
    }
  );

  if (githubRes.status === 404) {
    res.status(404).json({ error: `GitHub user "${username}" not found` });
    return;
  }

  if (!githubRes.ok) {
    res.status(500).json({ error: "Failed to fetch GitHub repos" });
    return;
  }

  const repos = (await githubRes.json()) as Array<{
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    fork: boolean;
  }>;

  const ownRepos = repos.filter((r) => !r.fork);
  const langCounts: Record<string, number> = {};
  for (const repo of ownRepos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1;
    }
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  const repoSummary = ownRepos
    .slice(0, 15)
    .map(
      (r) =>
        `- ${r.name} (${r.language ?? "no language"}): ${r.description ?? "no description"} — ⭐ ${r.stargazers_count}`
    )
    .join("\n");

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const systemInstruction = ROAST_STYLE_PROMPTS[style] ?? ROAST_STYLE_PROMPTS["Normal"]!;

  const prompt = `${systemInstruction}

GitHub username: ${username}
Number of public repos: ${ownRepos.length}
Top languages: ${topLanguages.join(", ") || "none"}

Their repos:
${repoSummary || "No public repos found — which is honestly its own kind of roast material."}

Generate a sharp, funny roast of this developer. Keep it under 200 words. Be specific about their repos and language choices.`;

  const result = await model.generateContent(prompt);
  const roastText = result.response.text();

  res.json({
    roast: roastText,
    username,
    repoCount: ownRepos.length,
    topLanguages,
  });
});

export default router;
