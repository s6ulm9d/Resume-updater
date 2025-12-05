import { NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const ResumeRequestSchema = z.object({
    name: z.string().optional(),
    contact: z.any().optional(),
    existing_resume_text: z.string().optional().default(""),
    detected_languages: z.array(z.string()).optional().default([]),
    top_repos: z.array(z.any()).optional().default([]),
    repo_count: z.number().optional().default(0),
    target_role: z.string().min(1, "Target role is required"),
    tone: z.string().optional().default("professional"),
})

export async function POST(req: Request) {
    let name = ""
    let contact: any = {}
    let existing_resume_text = ""
    let detected_languages: string[] = []
    let top_repos: any[] = []
    let repo_count = 0
    let target_role = ""
    let tone = ""

    try {
        if (!process.env.OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY is not defined")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const raw = await req.text().catch(() => "")
        let body: any = {}
        try {
            body = raw ? JSON.parse(raw) : {}
        } catch (_) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const parsed = ResumeRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request body", issues: parsed.error.format() }, { status: 400 })
        }

        // Assign parsed data to variables
        name = parsed.data.name || ""
        contact = parsed.data.contact || {}
        existing_resume_text = parsed.data.existing_resume_text
        detected_languages = parsed.data.detected_languages
        top_repos = parsed.data.top_repos
        repo_count = parsed.data.repo_count
        target_role = parsed.data.target_role
        tone = parsed.data.tone

        // DEBUG - ensure inputs are present
        console.debug("[resume.generate] inputs:", {
            name,
            contact,
            existing_resume_length: existing_resume_text?.length ?? 0,
            detected_languages,
            top_repos_count: top_repos.length,
            repo_count,
            target_role,
            tone
        })

        // Build GitHub summary object for prompt
        const githubData = {
            languages: detected_languages,
            top_repos,
            total_repos: repo_count,
            target_role
        }

        const systemMessage = `You are an AI resume generator.
You will receive two inputs:
1. Extracted Resume Data (raw text exactly as parsed from the PDF/Doc)
2. GitHub Project Data (latest repos, languages, descriptions, stars, and pinned repos)

Your job is to rewrite the resume using ONLY this provided data.
Never invent achievements, skills, or details that are not present in the inputs.

TASKS:
- Generate a professional summary strictly based on the user’s real experience, roles, skills, and GitHub activity.
- Extract and rewrite skills using only what appears in the resume OR GitHub.
- Rewrite experience using the real job titles, dates, tools, and tasks.
- Rewrite projects using the real GitHub data.
- If any field is missing, leave it out. DO NOT hallucinate.

OUTPUT FORMAT (strict JSON):
{
  "name": "Candidate Name",
  "contact": { "email": "...", "location": "..." },
  "summary": "Professional summary...",
  "skills": [ { "skill": "Skill Name", "description": "Brief context from data" } ],
  "experience": [ { "role": "...", "company": "...", "dates": "...", "bullets": ["..."] } ],
  "projects": [ { "name": "...", "short_desc": "...", "tech": ["..."], "bullets": ["..."], "url": "..." } ],
  "education": [ { "degree": "...", "school": "...", "year": "..." } ]
}
`

        const userMessage = `INPUTS:
Resume Data:
${(existing_resume_text || "").substring(0, 15000)}

GitHub Data:
${JSON.stringify(githubData, null, 2)}

Tone: ${tone || "neutral"}
Target role: ${target_role || ""}
`

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            temperature: 0.2,
            // request a JSON object format - the SDK may already return string, be defensive below
            response_format: { type: "json_object" },
            max_tokens: 2000
        })

        // The SDK may return content as an object or string. Handle both safely.
        const rawContent = completion?.choices?.[0]?.message?.content
        if (!rawContent) throw new Error("No content received from OpenAI")

        // content may already be an object (when response_format used) or a JSON string
        let parsedContent: any = null
        if (typeof rawContent === "object") {
            parsedContent = rawContent
        } else if (typeof rawContent === "string") {
            try {
                parsedContent = JSON.parse(rawContent)
            } catch (e) {
                // Some models return JSON inside markdown; try to extract the JSON block
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[0])
                } else {
                    throw new Error("Failed to parse model output as JSON")
                }
            }
        } else {
            throw new Error("Unexpected OpenAI content type")
        }

        // Normalize keys: prefer 'summary', but accept 'executive_summary'
        if (!parsedContent.summary && parsedContent.executive_summary) {
            parsedContent.summary = parsedContent.executive_summary
            delete parsedContent.executive_summary
        }

        // Ensure minimal structure
        parsedContent.name = parsedContent.name || name || ""
        parsedContent.contact = parsedContent.contact || contact || {}
        parsedContent.skills = Array.isArray(parsedContent.skills) ? parsedContent.skills : []
        parsedContent.experience = Array.isArray(parsedContent.experience) ? parsedContent.experience : []
        parsedContent.projects = Array.isArray(parsedContent.projects) ? parsedContent.projects : []
        parsedContent.education = Array.isArray(parsedContent.education) ? parsedContent.education : []

        // If model didn't provide a markdown resume, build a minimal one server-side (deterministic)
        const buildMarkdownFromJson = (j: any) => {
            const nameLine = `# ${j.name || "Candidate Name"}\n\n`
            const contactLine = `${j.contact?.email ? `Email: ${j.contact.email}` : ""
                }${j.contact?.location ? ` | ${j.contact.location}` : ""}\n\n`
            const summary = `## Summary\n${j.summary || ""}\n\n`
            const skills = `## Skills\n${(j.skills || [])
                .map((s: any) => `- **${s.skill}**: ${s.description || ""}`)
                .join("\n")}\n\n`
            const projects = `## Projects\n${(j.projects || [])
                .map((p: any) => `### ${p.name}\n${p.short_desc || ""}\n${(p.bullets || []).map((b: string) => `- ${b}`).join("\n")}\n`)
                .join("\n")}\n\n`
            const experience = `## Experience\n${(j.experience || [])
                .map((e: any) => `### ${e.role} — ${e.company} (${e.dates || ""})\n${(e.bullets || []).map((b: string) => `- ${b}`).join("\n")}\n`)
                .join("\n")}\n\n`
            const education = `## Education\n${(j.education || [])
                .map((ed: any) => `- ${ed.degree || ""}, ${ed.school || ""} ${ed.year ? `(${ed.year})` : ""}`)
                .join("\n")}\n\n`
            return [nameLine, contactLine, summary, skills, experience, projects, education].join("\n")
        }

        const markdown_resume = parsedContent.markdown_resume || buildMarkdownFromJson(parsedContent)

        return NextResponse.json({
            status: "success",
            json_output: parsedContent,
            markdown_resume,
            generated_at: new Date().toISOString(),
            is_fallback: false
        })
    } catch (error) {
        console.error("Resume Generation Error:", error)

        // Fallback only for rate limit / quota errors (be conservative)
        const err = error as any
        const isQuota =
            err?.status === 429 ||
            err?.code === "insufficient_quota" ||
            (err?.message && String(err.message).toLowerCase().includes("quota"))

        if (isQuota) {
            console.warn("Using controlled fallback due to quota/limit:", err.message || err)

            // Minimal, deterministic fallback that uses provided inputs (no hallucination)
            const primaryLang = detected_languages?.[0] || "Web"
            const allLangs = detected_languages?.slice(0, 3).join(", ") || primaryLang
            const role = target_role || "Software Engineer"
            const projectCount = (top_repos || []).length
            const topProjectNames = (top_repos || []).slice(0, 2).map((r: any) => r.name).join(" and ")

            let fallbackSummary = `Results-driven ${role} with experience in ${allLangs}.`
            if (projectCount > 0) {
                fallbackSummary += ` Contributed to ${projectCount} GitHub repos${topProjectNames ? ` including ${topProjectNames}` : ""}.`
            }

            const fallbackSkills = (detected_languages || []).slice(0, 8).map((lang: string) => ({
                skill: lang,
                description: `Experience using ${lang} (derived from repository metadata).`
            }))

            const fallbackProjects = (top_repos || []).slice(0, 5).map((repo: any) => ({
                name: repo.name,
                short_desc: repo.short_desc || repo.description || "",
                tech: repo.tech || [],
                bullets: [
                    repo.short_desc ? `Worked on ${repo.name}: ${repo.short_desc}` : `Contributed to ${repo.name}`,
                    repo.tech ? `Used ${Array.isArray(repo.tech) ? repo.tech.join(", ") : repo.tech}` : ""
                ].filter(Boolean),
                url: repo.url || repo.html_url || ""
            }))

            const json_output = {
                name: name || "",
                contact: contact || {},
                summary: fallbackSummary,
                skills: fallbackSkills,
                projects: fallbackProjects,
                experience: [],
                education: [],
                notes: "Generated via deterministic fallback (no hallucination)."
            }

            const fallbackMarkdown = `# ${json_output.name || "Candidate Name"}

Email: ${json_output.contact?.email || ""} | ${json_output.contact?.location || ""}

## Summary
${json_output.summary}

## Skills
${json_output.skills.map((s: any) => `- **${s.skill}**: ${s.description}`).join("\n")}

## Projects
${json_output.projects
                    .map((p: any) => `### ${p.name}\n${p.short_desc}\n${(p.bullets || []).map((b: string) => `- ${b}`).join("\n")}\n`)
                    .join("\n")}`

            return NextResponse.json({
                status: "success",
                json_output,
                markdown_resume: fallbackMarkdown,
                generated_at: new Date().toISOString(),
                is_fallback: true
            })
        }

        // For other errors return helpful diagnostics
        return NextResponse.json(
            {
                error: "Failed to generate resume"
            },
            { status: 500 }
        )
    }
}
