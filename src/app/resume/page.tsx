"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { FileText, Sparkles, Download, RefreshCw, Edit2, Save, Loader2, ChevronDown } from "lucide-react"
import { useProjects } from "@/context/ProjectContext"
import { useSession } from "next-auth/react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { saveAs } from "file-saver"

export default function ResumePage() {
    const { data: session } = useSession()
    const { projects } = useProjects()

    const [resumeText, setResumeText] = useState("")
    const [targetRole, setTargetRole] = useState("")
    const [tone, setTone] = useState("humanized, concise, mid-senior")
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedData, setGeneratedData] = useState<any>(null)
    const [isEditingSummary, setIsEditingSummary] = useState(false)
    const [editedSummary, setEditedSummary] = useState("")
    const [downloadFormat, setDownloadFormat] = useState<"md" | "pdf" | "docx">("md")
    const [showDownloadMenu, setShowDownloadMenu] = useState(false)
    const resumeRef = useRef<HTMLDivElement>(null)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // Aggregate data
            // Fetch READMEs for top repos to help AI analyze them
            const topReposWithReadmes = await Promise.all(projects.filter(p => p.selected !== false).slice(0, 5).map(async (p) => {
                let readme_snippet = ""
                try {
                    // Try to fetch README content via GitHub API
                    if (session?.accessToken && p.owner && p.name) {
                        const readmeRes = await fetch(`https://api.github.com/repos/${p.owner}/${p.name}/readme`, {
                            headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                                Accept: "application/vnd.github.v3.raw" // Request raw content directly
                            }
                        })
                        if (readmeRes.ok) {
                            const text = await readmeRes.text()
                            readme_snippet = text.substring(0, 2000) // Limit to 2k chars to save tokens
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to fetch README for ${p.name}`, e)
                }

                return {
                    name: p.name,
                    short_desc: p.description,
                    tech: [p.language, ...(p.topics || [])].filter(Boolean),
                    stars: p.stars,
                    commits: 0,
                    readme_snippet: readme_snippet,
                    url: p.url
                }
            }))

            const payload = {
                name: session?.user?.name || "",
                contact: { email: session?.user?.email || "", location: "Remote" },
                existing_resume_text: resumeText,
                detected_languages: Array.from(new Set([
                    ...projects.map(p => p.language).filter(Boolean),
                    ...projects.flatMap(p => p.topics || [])
                ])),
                top_repos: topReposWithReadmes,
                repo_count: projects.length,
                target_role: targetRole,
                tone: tone
            }

            const res = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to generate resume")

            const data = await res.json()
            setGeneratedData(data)
            setEditedSummary(data.json_output.executive_summary)
        } catch (error) {
            console.error(error)
            alert("Failed to generate resume. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSaveSummary = () => {
        if (generatedData) {
            setGeneratedData({
                ...generatedData,
                json_output: {
                    ...generatedData.json_output,
                    executive_summary: editedSummary
                }
            })
            setIsEditingSummary(false)
        }
    }

    const handleDownload = async (format: "md" | "pdf" | "docx") => {
        if (!generatedData) return

        if (format === "md") {
            const blob = new Blob([generatedData.markdown_resume], { type: "text/markdown" })
            saveAs(blob, "resume.md")
        } else if (format === "pdf") {
            if (resumeRef.current) {
                const canvas = await html2canvas(resumeRef.current, { scale: 2 })
                const imgData = canvas.toDataURL("image/png")
                const pdf = new jsPDF("p", "mm", "a4")
                const pdfWidth = pdf.internal.pageSize.getWidth()
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
                pdf.save("resume.pdf")
            }
        } else if (format === "docx") {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: generatedData.json_output.name,
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({
                            text: `${generatedData.json_output.contact.email} | ${generatedData.json_output.contact.location}`,
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({
                            text: "Executive Summary",
                            heading: HeadingLevel.HEADING_1
                        }),
                        new Paragraph({
                            text: generatedData.json_output.executive_summary
                        }),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({
                            text: "Skills",
                            heading: HeadingLevel.HEADING_1
                        }),
                        ...generatedData.json_output.skills.map((s: any) => new Paragraph({
                            children: [
                                new TextRun({ text: s.skill, bold: true }),
                                new TextRun({ text: `: ${s.description}` })
                            ],
                            bullet: { level: 0 }
                        })),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({
                            text: "Projects",
                            heading: HeadingLevel.HEADING_1
                        }),
                        ...generatedData.json_output.projects.flatMap((p: any) => [
                            new Paragraph({
                                text: p.name,
                                heading: HeadingLevel.HEADING_2
                            }),
                            new Paragraph({
                                text: p.short_desc,
                                style: "IntenseQuote"
                            }),
                            ...p.bullets.map((b: string) => new Paragraph({
                                text: b,
                                bullet: { level: 0 }
                            }))
                        ])
                    ]
                }]
            })

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, "resume.docx")
            })
        }
        setShowDownloadMenu(false)
    }

    return (
        <main className="min-h-screen relative overflow-hidden pb-32 pt-24">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <FileText size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold">AI Resume Generator</h1>
                        <p className="text-gray-400">Create a tailored, ATS-friendly resume from your GitHub profile</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-yellow-400" />
                                Configuration
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Target Role (Optional)</label>
                                    <input
                                        type="text"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        placeholder="e.g. Frontend Engineer, Full Stack Developer"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tone</label>
                                    <select
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="humanized, concise, mid-senior">Humanized & Concise (Recommended)</option>
                                        <option value="senior, leadership-focused">Senior & Leadership</option>
                                        <option value="technical, detailed">Technical & Detailed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Existing Resume Content (Optional)</label>
                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        placeholder="Paste your current resume text here to help the AI understand your background better..."
                                        className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || projects.length === 0}
                                    className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Generating Resume...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={24} />
                                            Generate Resume
                                        </>
                                    )}
                                </button>
                                {projects.length === 0 && (
                                    <p className="text-sm text-red-400 text-center">Please sync your projects on the Home page first.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-6">
                        {generatedData ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel p-8 rounded-2xl min-h-[600px] relative"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-xl font-bold">Resume Preview</h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            <Download size={18} />
                                            Download
                                            <ChevronDown size={16} />
                                        </button>
                                        {showDownloadMenu && (
                                            <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                                                <button onClick={() => handleDownload("md")} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm">Markdown (.md)</button>
                                                <button onClick={() => handleDownload("pdf")} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm">PDF (.pdf)</button>
                                                <button onClick={() => handleDownload("docx")} className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm">Word (.docx)</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Editable Summary */}
                                <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Executive Summary</h4>
                                        <button
                                            onClick={() => isEditingSummary ? handleSaveSummary() : setIsEditingSummary(true)}
                                            className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
                                        >
                                            {isEditingSummary ? <Save size={14} /> : <Edit2 size={14} />}
                                            {isEditingSummary ? "Save" : "Edit"}
                                        </button>
                                    </div>
                                    {isEditingSummary ? (
                                        <textarea
                                            value={editedSummary}
                                            onChange={(e) => setEditedSummary(e.target.value)}
                                            className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 resize-none"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {generatedData.json_output.executive_summary}
                                        </p>
                                    )}
                                </div>

                                {/* Resume Content for PDF Generation */}
                                <div ref={resumeRef} className="bg-white text-black p-8 rounded-lg mb-6 hidden">
                                    <h1 className="text-3xl font-bold mb-2">{generatedData.json_output.name}</h1>
                                    <p className="text-sm text-gray-600 mb-6">{generatedData.json_output.contact.email} | {generatedData.json_output.contact.location}</p>

                                    <h2 className="text-xl font-bold border-b-2 border-black mb-3">Executive Summary</h2>
                                    <p className="mb-6 text-sm">{generatedData.json_output.executive_summary}</p>

                                    <h2 className="text-xl font-bold border-b-2 border-black mb-3">Skills</h2>
                                    <ul className="mb-6 list-disc pl-5 text-sm">
                                        {generatedData.json_output.skills.map((s: any, i: number) => (
                                            <li key={i}><span className="font-bold">{s.skill}:</span> {s.description}</li>
                                        ))}
                                    </ul>

                                    <h2 className="text-xl font-bold border-b-2 border-black mb-3">Projects</h2>
                                    {generatedData.json_output.projects.map((p: any, i: number) => (
                                        <div key={i} className="mb-4">
                                            <h3 className="font-bold text-lg">{p.name}</h3>
                                            <p className="italic text-sm mb-1">{p.short_desc}</p>
                                            <ul className="list-disc pl-5 text-sm">
                                                {p.bullets.map((b: string, j: number) => (
                                                    <li key={j}>{b}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                {/* Markdown Preview (Simple) */}
                                <div className="prose prose-invert max-w-none">
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-400 bg-black/20 p-4 rounded-xl overflow-x-auto">
                                        {generatedData.markdown_resume}
                                    </pre>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="glass-panel p-8 rounded-2xl h-full flex flex-col items-center justify-center text-center opacity-50">
                                <FileText size={64} className="mb-4 text-gray-600" />
                                <h3 className="text-xl font-bold mb-2">Ready to Generate</h3>
                                <p className="text-gray-400 max-w-sm">
                                    Configure your preferences and click generate to create your AI-powered resume.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
