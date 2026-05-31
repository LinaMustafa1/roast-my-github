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

    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      return;
    }

    const systemInstruction = ROAST_STYLE_PROMPTS[style] ?? ROAST_STYLE_PROMPTS["Normal"]!;

    const userPrompt = `GitHub username: ${username}
Number of public repos: ${ownRepos.length}
Top languages: ${topLanguages.join(", ") || "none"}

Their repos:
${repoSummary || "No public repos found — which is honestly its own kind of roast material."}

Generate a sharp, funny roast of this developer. Keep it under 200 words. Be specific about their repos and language choices.`;

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 512,
          temperature: 1.0,
        }),
      }
    );

    if (!groqRes.ok) {
      const errBody = await groqRes.json().catch(() => ({}));
      req.log.error({ groqStatus: groqRes.status, errBody }, "Groq API error");
      if (groqRes.status === 429) {
        res.status(429).json({ error: "Groq API rate limit hit. Please try again in a moment." });
        return;
      }
      throw new Error(`Groq returned ${groqRes.status}`);
    }

    const groqData = (await groqRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const roastText = groqData.choices?.[0]?.message?.content ?? "...";

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
