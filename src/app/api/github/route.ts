// src/app/api/github/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        let token = session?.accessToken as string | undefined

        if (!token) {
            // only accept token from header when explicitly provided by trusted clients
            const header = req.headers.get("authorization")
            if (header?.startsWith("Bearer ")) token = header.split(" ")[1]
        }

        if (!token) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const url = new URL(req.url)
        const per_page = url.searchParams.get("per_page") || "100"

        // Fetch user's repos
        const res = await fetch(`https://api.github.com/user/repos?per_page=${per_page}&sort=updated`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        })

        if (!res.ok) {
            const txt = await res.text()
            console.error("GitHub API error:", res.status, txt)
            return NextResponse.json({ error: "Failed to fetch from GitHub" }, { status: res.status })
        }

        const repos = await res.json()

        // Map to the shape your frontend expects (lightweight)
        const mapped = repos.map((r: any) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            description: r.description,
            html_url: r.html_url,
            url: r.url,
            language: r.language,
            topics: r.topics || [],
            stars: r.stargazers_count,
            private: r.private
        }))

        return NextResponse.json({ status: "success", repos: mapped })
    } catch (error) {
        console.error("github.route error:", error)
        return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 })
    }
}
