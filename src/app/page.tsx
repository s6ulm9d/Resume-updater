"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Github, RefreshCw, LogOut, Loader2, Sparkles } from "lucide-react"
import { ProjectCard } from "@/components/ProjectCard"
import { useProjects } from "@/context/ProjectContext"
import { useRouter } from "next/navigation"

export default function Home() {
  const { data: session, status } = useSession()
  const { projects, setProjects, toggleProjectSelection, setAnalysis } = useProjects()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const fetchProjects = async () => {
    if (!session?.accessToken) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (!res.ok) throw new Error("Failed to fetch projects")

      const data = await res.json()
      setProjects(data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        url: repo.html_url,
        language: repo.language,
        topics: repo.topics || [],
        owner: repo.owner.login,
        default_branch: repo.default_branch,
        selected: true
      })))
    } catch (err) {
      setError("Failed to sync projects. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeProfile = async () => {
    const selectedProjects = projects.filter(p => p.selected !== false)
    if (selectedProjects.length === 0) {
      setError("Please select at least one project to analyze")
      return
    }

    setAnalyzing(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: selectedProjects,
          username: session?.user?.name
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.details || "Analysis failed")
      }

      const data = await res.json()
      setAnalysis(data)
      router.push("/profile")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleAll = () => {
    const allSelected = projects.every(p => p.selected !== false)
    setProjects(projects.map(p => ({ ...p, selected: !allSelected })))
  }

  return (
    <main className="min-h-screen relative overflow-hidden pb-32">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-end items-center mb-16">
          {status === "authenticated" ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-sm font-medium">{session.user?.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              Sign In
            </button>
          )}
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            Your GitHub <br />
            <span className="text-gradient">Supercharged</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 mb-8"
          >
            Connect your GitHub account to sync, manage, and showcase your projects with a stunning, futuristic interface.
          </motion.p>

          {status === "unauthenticated" && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => signIn("github")}
              className="btn-primary flex items-center gap-3 mx-auto text-lg px-8 py-4"
            >
              <Github size={24} />
              Connect with GitHub
            </motion.button>
          )}
        </div>

        {/* Projects Section */}
        {status === "authenticated" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-2xl p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Github className="text-purple-400" />
                  Your Projects
                </h2>
                {projects.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-full hover:bg-white/5"
                  >
                    {projects.every(p => p.selected !== false) ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                {projects.length > 0 && (
                  <button
                    onClick={analyzeProfile}
                    disabled={analyzing}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {analyzing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} className="text-yellow-400" />
                    )}
                    AI Analysis
                  </button>
                )}

                <button
                  onClick={fetchProjects}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  {projects.length > 0 ? "Sync Projects" : "Fetch Projects"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
                {error}
              </div>
            )}

            {projects.length === 0 && !loading && !error ? (
              <div className="text-center py-20 text-gray-500">
                <Github size={48} className="mx-auto mb-4 opacity-20" />
                <p>No projects synced yet. Click the button above to fetch your repositories.</p>
              </div>
            ) : (
              <div className="grid-projects">
                {projects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    onToggle={toggleProjectSelection}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}
