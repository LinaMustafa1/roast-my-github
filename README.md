# 🔥 Roast My GitHub
### Solution Architect / Applied AI Engineer Internship Task — Solution25

A web app that fetches a GitHub user's public repos and generates a savage, funny roast using AI.

**Live demo:** https://git-hub-roast-bot--linamusstafa.replit.app

---

## What It Does

- Enter any GitHub username
- Pick a roast style: **Normal, Corporate Jargon, Pirate, or Haiku**
- The app fetches their public repos via the GitHub API
- Sends repo data (names, stars, languages) to an LLM
- Returns a personalized, accurate roast

---

## How to Run It

### Fork on Replit (easiest — under 2 minutes)
1. Go to https://replit.com/@linamusstafa/GitHub-Roast-Bot
2. Click Fork
3. Add your OpenRouter API key as a Secret: `OPENROUTER_API_KEY`
4. Get a free key at https://openrouter.ai — no card needed
5. Click Run

### Run Locally
```bash
git clone https://github.com/LinaMustafa1/roast-my-github
cd roast-my-github
npm install
echo "OPENROUTER_API_KEY=your_key_here" > .env
node server.js
```
Then open http://localhost:3000

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js + Express
- **APIs:** GitHub REST API (no auth needed) + OpenRouter (LLM)
- **Model:** openai/gpt-oss-20b:free via OpenRouter free tier
- **Deployed on:** Replit

---

## The Prompt I Settled On

```

You are a comedy roast writer. Roast this GitHub user based on their repos.
Be funny, specific, and accurate — reference their actual repo names,
star counts, and languages. Keep it under 150 words. Style: {style}.

User: {username}
Repos: {repoList}
Languages: {languages}
Total stars: {totalStars}

```

---

### What I Tried First

**Attempt 1** — Generic prompt with no repo data: output was vague and could apply to anyone.

**Attempt 2** — Dumped raw JSON into the prompt: LLM got confused by the noise, output was inconsistent.

**Attempt 3 (final)** — Extracted only meaningful fields (name, stars, language), formatted them cleanly, added a word limit and explicit style instruction. Result: specific, funny, accurate roasts every time.

---

## Error States

- **Unknown user:** "404: TALENT NOT FOUND — GitHub says this user doesn't exist."
- **Private/empty account:** Graceful message explaining no public repos were found
- **API failure:** User-friendly error with a retry button

---

## What I'd Do With More Time

1. Add a **copy roast** button — one click to clipboard
2. **Roast history** stored in localStorage
3. **Share to Twitter** — pre-filled tweet with the roast
4. **Rate limiting** — cache roasts per username for 60 seconds
5. **More roast styles** — ELI5, Shakespearean, Gordon Ramsay

---

## Replit Agent Prompts Used

**Prompt 1:**
> Build a "Roast My GitHub" web app. Node.js + Express backend with server.js, and a public/index.html frontend. The backend has a POST /api/roast endpoint that accepts a GitHub username and roast style, fetches the user's public repos from the GitHub API, then calls the Gemini API with the repo data to generate a funny roast. The frontend has an input for GitHub username, a dropdown for roast style (Normal, Corporate Jargon, Pirate, Haiku), a Roast Me button, and displays the result.

**Prompt 2:**
> Replace the Gemini API call with OpenRouter API. POST to https://openrouter.ai/api/v1/chat/completions with Authorization: Bearer header using OPENROUTER_API_KEY env variable. Use model "meta-llama/llama-3.1-8b-instruct:free"

---

Built by Lina Mustafa — May 2026
