import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    let name = "";
    let contact: any = {};
    let existing_resume_text = "";
    let detected_languages: string[] = [];
    let top_repos: any[] = [];
    let repo_count = 0;
    let target_role = "";
    let tone = "";

    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not defined in environment variables")
        }

        const body = await req.json();
        ({
            name,
            contact,
            existing_resume_text,
            detected_languages,
            top_repos,
            repo_count,
            target_role,
            tone
        } = body);

        // Basic validation
        if (!top_repos || !Array.isArray(top_repos)) {
            return NextResponse.json({ error: "Invalid payload: top_repos is required" }, { status: 400 })
        }

        // Construct the prompt
        const systemMessage = `You are a professional resume writer for software developers. Produce concise, specific, achievement-focused resumes. Avoid generic filler and repeated sentences like "used in multiple projects for development." When referencing repositories, pull exact repo names and concrete signals (commits, README lines, package.json tech). If a numeric metric is not provided, use qualitative language like "small CLI tool", "single-page portfolio", or "library used in several projects." Return two outputs in one response: json_output (strict schema) and markdown_resume. Do not invent facts; if something is not present, say so using non-numeric phrasing.`

        const userMessage = `Candidate data:

name: "${name || ''}"
contact: ${JSON.stringify(contact || {})}
existing_resume_text: "${(existing_resume_text || '').substring(0, 8000).replace(/[\n\r]+/g, ' ')}"
top_repos: ${JSON.stringify(top_repos)}
detected_languages: ${JSON.stringify(detected_languages || [])}
target_role: "${target_role || ''}"
tone: "${tone || 'humanized, concise, mid-senior'}"

Task: Generate a 1-page ATS-friendly resume (Markdown) that requires minimal edits by the user. Follow these strict rules:

Executive summary: exactly 2 sentences. First names the candidate (if provided) and their primary focus (frontend / backend / full-stack / mobile). Second mentions one concrete achievement or the strongest skill. No generic phrases.

Skills: Produce up to 8 skills. For each skill produce a single short descriptor (8–16 words) that references a repo name or a tech usage example. Example: TypeScript — Built typed frontend components and reusable utilities in portfolio and frontend.

Projects: include top 5 repos (rank by stars, then commits). For each repo create two targeted bullets:
Bullet A: purpose + one concrete feature (use README or package.json to extract features).
Bullet B: result/what it demonstrates (architecture, test coverage, CI, user-facing outcome). Use qualitative language (e.g., "improved dev feedback loop", "modular architecture for reuse").

Avoid repeated boilerplate sentences across projects and skills. Vary phrasing and use active verbs.

If repo readme or package.json contains keywords like "React", "Express", "Android", mention them explicitly.

Output schema (JSON) must be exactly:

{
 "name": string,
 "contact": { "email": string, "location": string },
 "executive_summary": string,
 "skills": [{"skill":string,"description":string}],
 "projects": [{"name":string,"short_desc":string,"tech":[string],"bullets":[string],"url":string}],
 "notes": string
}

After the JSON, include markdown_resume string that is properly formatted for direct display and PDF conversion. Keep it to ~1 page.

If information is missing (e.g., no README snippet), write a single short fallback bullet using available signals (commits, language).

Use the input data now and return the JSON then the markdown_resume.`

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            model: "gpt-4o",
            temperature: 0.6,
            response_format: { type: "json_object" },
        })

        const content = completion.choices[0].message.content
        if (!content) throw new Error("No content received from OpenAI")

        const result = JSON.parse(content)

        return NextResponse.json({
            status: "success",
            json_output: result.json_output || result,
            markdown_resume: result.markdown_resume,
            generated_at: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("Resume Generation Error:", error)

        // Fallback for quota limits or API errors
        // We are keeping the fallback logic active for now to ensure output quality even if API fails
        if (error?.status === 429 || error?.code === 'insufficient_quota' || error?.message?.includes('quota')) {
            console.log("Returning enhanced fallback resume data due to error:", error.message)

            // 1. Smart Summary Generator
            const primaryLang = detected_languages?.[0] || 'Web';
            const allLangs = detected_languages?.slice(0, 3).join(', ') || primaryLang;
            const role = target_role || "Software Engineer";
            const projectCount = top_repos?.length || 0;
            const topProjectNames = top_repos?.slice(0, 2).map((r: any) => r.name).join(' and ');

            let fallbackSummary = `Results-driven ${role} specialized in ${allLangs}. `;
            if (projectCount > 0) {
                fallbackSummary += `Demonstrated experience building ${projectCount} projects including ${topProjectNames}. `;
            } else {
                fallbackSummary += `Proven track record of building scalable applications. `;
            }
            fallbackSummary += `Dedicated to writing clean, maintainable code and contributing to open-source software.`;

            // 2. Smart Skill Descriptions
            const skillDescriptions: Record<string, string> = {
                "Kotlin": "Architected type-safe, asynchronous applications using Coroutines and modern JVM patterns.",
                "TypeScript": "Designed strict, type-safe interfaces and reusable components to ensure codebase scalability.",
                "JavaScript": "Implemented complex asynchronous logic and dynamic client-side state management.",
                "HTML": "Structured semantic, accessible (WCAG compliant) markup for optimized SEO and performance.",
                "CSS": "Created responsive, fluid layouts using modern Flexbox/Grid and CSS variables.",
                "React": "Built component-driven UIs with efficient state management and lifecycle optimization.",
                "Node.js": "Developed scalable REST APIs and backend services with a focus on performance.",
                "Python": "Wrote efficient scripts and automation tools for data processing and system tasks."
            };

            const fallbackSkills = (detected_languages || []).slice(0, 8).map((lang: string) => ({
                skill: lang,
                level: "working",
                description: skillDescriptions[lang] || `Applied ${lang} to build efficient, modular, and testable software solutions.`
            }))

            // 3. Smart Project Bullets based on keywords
            const fallbackProjects = (top_repos || []).slice(0, 5).map((repo: any) => {
                const name = repo.name.toLowerCase();
                const techStack = repo.tech?.join(', ') || 'modern technologies';

                let bullets = [];

                if (repo.short_desc) {
                    bullets.push(`Developed ${repo.name}, a ${repo.short_desc}.`);
                } else {
                    bullets.push(`Engineered core features for ${repo.name}, ensuring high performance and reliability.`);
                }

                bullets.push(`Leveraged ${techStack} to build a scalable and maintainable solution.`);

                if (name.includes('portfolio') || name.includes('site') || name.includes('web')) {
                    bullets[1] = "Optimized asset loading and rendering performance, achieving high Lighthouse scores.";
                } else if (name.includes('api') || name.includes('server') || name.includes('backend')) {
                    bullets[1] = "Architected scalable API endpoints with secure authentication and efficient data retrieval.";
                }

                return {
                    name: repo.name,
                    short_desc: repo.short_desc || `A ${repo.tech?.[0] || 'software'} engineering project.`,
                    tech: repo.tech || [],
                    bullets: bullets,
                    url: repo.url
                };
            })

            const fallbackMarkdown = `
# ${name || 'Candidate Name'}
${contact?.email ? `Email: ${contact.email}` : ''} | ${contact?.location ? `Location: ${contact.location}` : ''}

## Executive Summary
${fallbackSummary}

## Skills
${fallbackSkills.map((s: any) => `- **${s.skill}**: ${s.description}`).join('\n')}

## Projects
${fallbackProjects.map((p: any) => `
### ${p.name}
${p.short_desc}
${p.bullets.map((b: string) => `- ${b}`).join('\n')}
`).join('\n')}
            `.trim()

            return NextResponse.json({
                status: "success",
                json_output: {
                    name: name || "",
                    contact: contact || {},
                    executive_summary: fallbackSummary,
                    skills: fallbackSkills,
                    projects: fallbackProjects,
                    notes: "Generated via enhanced fallback logic."
                },
                markdown_resume: fallbackMarkdown,
                generated_at: new Date().toISOString(),
                is_fallback: true
            })
        }

        return NextResponse.json({
            error: "Failed to generate resume",
            details: error.message || String(error)
        }, { status: 500 })
    }
}
