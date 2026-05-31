import { Router } from "express";
import { GenerateRoastBody } from "@workspace/api-zod";

const router = Router();

const ROAST_STYLE_PROMPTS: Record<string, string> = {
  Normal: "You are a brutally honest, witty comedian. Roast this GitHub user based on their repos. Be funny but not mean-spirited. Use casual language.",
  "Corporate Jargon": "You are a parody corporate executive. Roast this GitHub user using excessive buzzwords, synergy, blue-sky thinking, circle back, leverage, pivot, and corporate jargon. Make it absurd.",
  Pirate: "Arr! You be a salty pirate captain. Roast this GitHub user in pirate speak — use 'arr', 'matey', 'shiver me timbers', 'Davy Jones', etc. Make it funny and nautical.",
  Haiku: "You are a haiku master. Write a roast of this GitHub user ONLY as a series of haikus (5-7-5 syllables each). Write 3 haikus. Be clever and funny.",
};

router.post("/roast", async (req, res) => {
  try {
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
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    req.log.info({ githubStatus: githubRes.status, username }, "GitHub API response");

    if (githubRes.status === 404) {
      res.status(404).json({ error: `GitHub user "${username}" not found` });
      return;
    }

    if (!githubRes.ok) {
      const body = await githubRes.text();
      req.log.error({ githubStatus: githubRes.status, body }, "GitHub API error");
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
          `- ${r.name} (${r.language ?? "no language"}): ${r.description ?? "no description"} — ${r.stargazers_count} stars`
      )
      .join("\n");

    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const systemInstruction = ROAST_STYLE_PROMPTS[style] ?? ROAST_STYLE_PROMPTS["Normal"]!;

    const prompt = `${systemInstruction}

GitHub username: ${username}
Number of public repos: ${ownRepos.length}
Top languages: ${topLanguages.join(", ") || "none"}

Their repos:
${repoSummary || "No public repos found — which is honestly its own kind of roast material."}

Generate a sharp, funny roast of this developer. Keep it under 200 words. Be specific about their repos and language choices.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 1.0 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      req.log.error({ geminiStatus: geminiRes.status, errBody }, "Gemini API error");
      if (geminiRes.status === 429) {
        res.status(429).json({
          error:
            "Gemini API quota exceeded. Enable billing at https://aistudio.google.com or wait for the quota to reset.",
        });
        return;
      }
      throw new Error(`Gemini returned ${geminiRes.status}`);
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const roastText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "...";

    res.json({
      roast: roastText,
      username,
      repoCount: ownRepos.length,
      topLanguages,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Roast generation failed");
    const status = (err as { status?: number }).status;
    if (status === 429) {
      res.status(429).json({
        error:
          "Gemini API quota exceeded. Your API key's free tier limit has been reached. Enable billing at https://aistudio.google.com or wait for the quota to reset.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to generate roast. Please try again." });
  }
});

export default router;
