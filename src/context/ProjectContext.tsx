"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface ProjectContextType {
    projects: any[]
    setProjects: (projects: any[]) => void
    toggleProjectSelection: (id: number) => void
    analysis: any
    setAnalysis: (analysis: any) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<any[]>([])
    const [analysis, setAnalysis] = useState<any>(null)

    const toggleProjectSelection = useCallback((id: number) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, selected: !p.selected } : p
        ))
    }, [])

    return (
        <ProjectContext.Provider value={{ projects, setProjects, toggleProjectSelection, analysis, setAnalysis }}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProjects() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error("useProjects must be used within a ProjectProvider")
    }
    return context
}
