// src/app/api/github/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import NextAuth from "next-auth"
import { authOptions } from "@/lib/authOptions" // optional: if you centralize NextAuth config
// NOTE: If you don't use getServerSession here, you may accept a token from the client (bearer), but server-side session is more secure.

export async function GET(req: Request) {
    try {
        // Expect an Authorization header with a personal access token OR rely on session cookie (recommended)
        const authHeader = req.headers.get("authorization")
        let token = null

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.replace("Bearer ", "")
        } else {
            // Optionally attempt to read session (requires getServerSession config)
            // If you don't have getServerSession set up for edge functions, skip this block and require token client-side.
            try {
                // WARNING: getServerSession in App Router requires some setup; keep this optional
                // const session = await getServerSession(authOptions)
                // token = session?.accessToken
            } catch (e) {
                // ignore
            }
        }

        if (!token) {
            return NextResponse.json({ error: "Missing GitHub access token" }, { status: 401 })
        }

        const url = new URL(req.url)
        const usernameParam = url.searchParams.get("username") || ""
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
            return NextResponse.json({ error: "Failed to fetch from GitHub", details: txt }, { status: res.status })
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
    } catch (error: any) {
        console.error("github.route error:", error)
        return NextResponse.json({ error: "Failed to fetch GitHub data", details: error?.message || String(error) }, { status: 500 })
    }
}
