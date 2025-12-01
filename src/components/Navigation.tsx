"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Sparkles, FileText } from "lucide-react"
import { motion } from "framer-motion"

export function Navigation() {
    const pathname = usePathname()

    const links = [
        { href: "/", label: "Home", icon: Home },
        { href: "/profile", label: "AI Profile", icon: User },
        { href: "/resume", label: "Resume", icon: FileText },
    ]

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-panel px-2 py-2 rounded-full flex items-center gap-2">
                {links.map((link) => {
                    const isActive = pathname === link.href
                    const Icon = link.icon

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon size={20} className="relative z-10" />
                            <span className="relative z-10 font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
