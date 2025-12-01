import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    let projects: any[] = [];
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not defined in environment variables")
        }

        const body = await req.json()
        projects = body.projects
        const { username } = body

        if (!projects || !Array.isArray(projects)) {
            return NextResponse.json({ error: "Invalid projects data" }, { status: 400 })
        }

        // Create a summary of the projects for the prompt
        const projectSummary = projects
            .map((p: any) => `- ${p.name} (${p.language}): ${p.description || "No description"} | Stars: ${p.stars} | Forks: ${p.forks}`)
            .join("\n")

        const prompt = `
      You are an expert technical writer and career coach who writes natural, human-sounding, concise professional summaries and resumes for software developers. Your tone should be clear, confident, and human — not repetitive or robotic. Use active verbs, concrete outcomes, and keep filler/templated phrases to a minimum. When creating skill descriptions, show how the skill is used in projects (one short example per skill). Output both a machine-friendly JSON object and a polished Markdown section for UI preview.

      User message:
      Below is raw analysis data extracted from a candidate's GitHub. Use it to produce:
      
      json_output — a JSON object (see schema below) with clear fields.
      markdown_output — a humanized Executive Summary + Detected Skills with descriptions + Project Highlights in Markdown (suitable for showing in the UI).

      Use this input:
      name: "${username}"
      projects:
      ${projectSummary}

      Rules & requirements (must follow):
      Produce JSON following the schema below exactly. Fields that don't apply should be empty strings or empty arrays.
      For the Executive Summary: prefer 2–3 short sentences, name a concrete skill or achievement, avoid boilerplate like "demonstrating proficiency".
      Skills: list up to 8 skills. For each skill, give a 1–2 sentence description of how it's used (mention a repo example if possible).
      Project Highlights: pick up to 5 repos (rank by stars then commits) and for each produce 2–3 bullet points: purpose, key tech, and one outcome/what it demonstrates.
      Tone: be human, specific, and concise.
      Output both json_output and markdown_output. Place them in separate top-level keys.

      JSON schema (required):
      {
        "json_output": {
            "name": string,
            "executive_summary": string,
            "skills": [ { "skill": string, "level": "familiar | working | strong", "description": string } ],
            "projects": [ { "name": string, "short_desc": string, "tech": [string], "bullets": [string], "url": string } ],
            "sources": { "repo_count": int, "top_repo_names": [string] }
        },
        "markdown_output": string
      }
    `

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o",
            temperature: 0.7,
            response_format: { type: "json_object" },
        })

        const content = completion.choices[0].message.content
        if (!content) throw new Error("No content received from OpenAI")

        const result = JSON.parse(content)

        // Map the new structure to the old one expected by the frontend for backward compatibility
        // or update the frontend to use the new structure. For now, we'll adapt it.
        return NextResponse.json({
            summary: result.json_output.executive_summary,
            skills: result.json_output.skills.map((s: any) => s.skill),
            projects: result.json_output.projects.map((p: any) => ({
                name: p.name,
                details: p.short_desc + " " + p.bullets.join(" ")
            })),
            raw: result // Send the full new structure too if needed later
        })

    } catch (error: any) {
        console.error("OpenAI Error:", error)

        // Fallback for development/quota limits
        if (error?.status === 429 || error?.code === 'insufficient_quota') {
            console.log("Quota exceeded, returning generated data from GitHub stats")

            // Generate skills from project languages
            const allLanguages = projects.map((p: any) => p.language).filter(Boolean);
            const langCounts: Record<string, number> = {};
            allLanguages.forEach((l: string) => {
                langCounts[l] = (langCounts[l] || 0) + 1;
            });
            const sortedLanguages = Object.entries(langCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([l]) => l);

            const topLangs = sortedLanguages.slice(0, 3);
            const primaryLang = topLangs[0] || "modern web technologies";

            const summary = `Software developer focused on practical, maintainable web apps and ${primaryLang} tools. Maintains an active portfolio of ${projects.length} repositories that showcase full-stack projects—often emphasizing clean architecture and quick iteration cycles.`;

            return NextResponse.json({
                summary,
                skills: sortedLanguages.slice(0, 8),
                projects: projects.slice(0, 5).map((p: any) => ({
                    name: p.name,
                    details: p.description || `A ${p.language || 'software'} project demonstrating core development principles and practical implementation of ${p.language || 'tech'} features.`
                }))
            })
        }

        return NextResponse.json({
            error: "Failed to generate analysis",
            details: error.message || String(error)
        }, { status: 500 })
    }
}
