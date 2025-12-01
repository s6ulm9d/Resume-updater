"use client"

import { motion } from "framer-motion"
import { Star, GitFork, ExternalLink } from "lucide-react"

interface ProjectProps {
    id: number
    name: string
    description: string
    stars: number
    forks: number
    url: string
    language: string
    selected?: boolean
}

export function ProjectCard({ project, index, onToggle }: { project: ProjectProps; index: number; onToggle: (id: number) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`glass-card p-6 rounded-xl flex flex-col h-full relative group overflow-hidden transition-all duration-300 ${!project.selected ? 'opacity-60 grayscale' : ''}`}
            style={{ padding: '1.5rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Selection Checkbox */}
            <div className="absolute top-4 right-4 z-20">
                <label className="flex items-center cursor-pointer relative">
                    <input
                        type="checkbox"
                        checked={project.selected ?? true}
                        onChange={() => onToggle && onToggle(project.id)}
                        className="peer sr-only"
                    />
                    <div className="w-6 h-6 rounded-md border-2 border-white/20 peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                        <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </label>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4 pr-8">
                    <h3 className="text-xl font-bold text-white truncate" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                    </h3>
                </div>

                <p className="text-gray-400 mb-6 flex-grow line-clamp-3" style={{ color: '#9ca3af', marginBottom: '1.5rem', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.description || "No description available"}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mt-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', color: '#6b7280', marginTop: 'auto' }}>
                    <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Star size={16} className="text-yellow-500" style={{ color: '#eab308' }} />
                            {project.stars}
                        </span>
                        <span className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <GitFork size={16} />
                            {project.forks}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {project.language && (
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs" style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.75rem' }}>
                                {project.language}
                            </span>
                        )}
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white transition-colors"
                            style={{ color: '#9ca3af', transition: 'color 0.2s' }}
                        >
                            <ExternalLink size={18} />
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
