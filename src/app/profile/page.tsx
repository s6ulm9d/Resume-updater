"use client"

import { motion } from "framer-motion"
import { Sparkles, Github, Save, Edit2, Plus } from "lucide-react"
import { useProjects } from "@/context/ProjectContext"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function ProfilePage() {
    const { analysis, setAnalysis } = useProjects()
    const [isEditing, setIsEditing] = useState(false)
    const [editedAnalysis, setEditedAnalysis] = useState<any>(null)

    useEffect(() => {
        if (analysis) {
            setEditedAnalysis(JSON.parse(JSON.stringify(analysis)))
        }
    }, [analysis])

    const handleSave = () => {
        setAnalysis(editedAnalysis)
        setIsEditing(false)
    }

    const handleSkillChange = (index: number, value: string) => {
        const newSkills = [...editedAnalysis.skills]
        newSkills[index] = value
        setEditedAnalysis({ ...editedAnalysis, skills: newSkills })
    }

    const handleProjectChange = (index: number, field: string, value: string) => {
        const newProjects = [...editedAnalysis.projects]
        newProjects[index] = { ...newProjects[index], [field]: value }
        setEditedAnalysis({ ...editedAnalysis, projects: newProjects })
    }

    if (!analysis || !editedAnalysis) {
        return (
            <main className="min-h-screen relative overflow-hidden flex items-center justify-center">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
                </div>

                <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                        <Sparkles size={32} className="text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">No Analysis Generated Yet</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        Go to the home page, sync your GitHub projects, and run the AI analysis to see your profile here.
                    </p>
                    <Link href="/" className="btn-primary inline-flex items-center gap-2">
                        <Github size={20} />
                        Go to Home
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen relative overflow-hidden pb-32">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Sparkles size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold">AI Profile Analysis</h1>
                                <p className="text-gray-400">Generated from your GitHub activity</p>
                            </div>
                        </div>

                        <button
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            className={`btn-primary flex items-center gap-2 ${isEditing ? 'bg-green-500 hover:bg-green-600 border-green-500' : ''}`}
                        >
                            {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
                            {isEditing ? "Save Changes" : "Edit Analysis"}
                        </button>
                    </div>

                    <div className="grid gap-8">
                        {/* Summary Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-panel p-8 rounded-2xl"
                        >
                            <h3 className="text-sm uppercase tracking-wider text-purple-400 mb-4 font-semibold">Executive Summary</h3>
                            {isEditing ? (
                                <textarea
                                    value={editedAnalysis.summary}
                                    onChange={(e) => setEditedAnalysis({ ...editedAnalysis, summary: e.target.value })}
                                    className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-gray-200 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                                />
                            ) : (
                                <p className="text-xl text-gray-200 leading-relaxed font-light whitespace-pre-wrap">
                                    {analysis.summary}
                                </p>
                            )}
                        </motion.div>

                        {/* Skills Card */}
                        {analysis.skills && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="glass-panel p-8 rounded-2xl"
                            >
                                <h3 className="text-sm uppercase tracking-wider text-blue-400 mb-6 font-semibold">Detected Skills</h3>
                                <div className="flex flex-wrap gap-3">
                                    {isEditing ? (
                                        <>
                                            {editedAnalysis.skills.map((skill: string, i: number) => (
                                                <div key={i} className="relative group">
                                                    <input
                                                        value={skill}
                                                        onChange={(e) => handleSkillChange(i, e.target.value)}
                                                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-purple-500/50 transition-all w-32"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newSkills = editedAnalysis.skills.filter((_: any, index: number) => index !== i)
                                                            setEditedAnalysis({ ...editedAnalysis, skills: newSkills })
                                                        }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Plus size={12} className="rotate-45" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditedAnalysis({ ...editedAnalysis, skills: [...editedAnalysis.skills, "New Skill"] })}
                                                className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/50 text-purple-300 hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                                            >
                                                <Plus size={16} /> Add Skill
                                            </button>
                                        </>
                                    ) : (
                                        analysis.skills.map((skill: string, i: number) => (
                                            <motion.span
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.2 + (i * 0.05) }}
                                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 hover:border-purple-500/30 hover:text-white transition-all cursor-default"
                                            >
                                                {skill}
                                            </motion.span>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Projects Grid */}
                        {analysis.projects && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <Github className="text-purple-400" />
                                    Project Highlights
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {isEditing ? (
                                        editedAnalysis.projects.map((project: any, i: number) => (
                                            <div key={i} className="glass-card p-6 rounded-xl">
                                                <input
                                                    value={project.name}
                                                    onChange={(e) => handleProjectChange(i, 'name', e.target.value)}
                                                    className="w-full bg-transparent text-xl font-bold text-white mb-3 border-b border-white/10 focus:border-purple-500 outline-none pb-2"
                                                />
                                                <textarea
                                                    value={project.details}
                                                    onChange={(e) => handleProjectChange(i, 'details', e.target.value)}
                                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-gray-400 focus:outline-none focus:border-purple-500/50 resize-none"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        analysis.projects.map((project: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 + (i * 0.1) }}
                                                className="glass-card p-6 rounded-xl group"
                                            >
                                                <h4 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                                                    {project.name}
                                                </h4>
                                                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors whitespace-pre-wrap">
                                                    {project.details}
                                                </p>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </main>
    )
}
