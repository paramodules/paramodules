import type { Project, ProjectFiles } from "@stackblitz/sdk"

export const reactExampleOpenFile = "src/components/app.tsx"

const reactExampleFilePaths = [
    "README.md",
    "index.html",
    "package.json",
    "tailwind.config.js",
    "tsconfig.json",
    "tsconfig.node.json",
    "vite-env.d.ts",
    "vite.config.ts",
    "src/api.ts",
    "src/cache.ts",
    "src/context.ts",
    "src/index.css",
    "src/main.tsx",
    "src/components/app.tsx",
    "src/components/comment.tsx",
    "src/components/feed.tsx",
    "src/components/post.tsx",
    "src/components/reply.tsx",
    "src/components/session.tsx"
] as const

async function fetchStaticFile(assetBaseUrl: string, path: string) {
    const response = await fetch(`${assetBaseUrl}${path}`)

    if (!response.ok) {
        throw new Error(`Failed to load ${path} for StackBlitz`)
    }

    return response.text()
}

export async function loadReactExampleProject(
    assetBaseUrl: string
): Promise<Project> {
    const files = Object.fromEntries(
        await Promise.all(
            reactExampleFilePaths.map(async (path) => [
                path,
                await fetchStaticFile(assetBaseUrl, path)
            ])
        )
    ) as ProjectFiles

    return {
        title: "paramodules React example",
        description:
            "A Vite React demo showing paramodules modules, params, and React Context propagation.",
        template: "node",
        files
    }
}
