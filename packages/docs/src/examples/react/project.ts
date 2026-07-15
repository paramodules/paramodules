import type { Project, ProjectFiles } from "@stackblitz/sdk"

export const reactExampleOpenFile = "src/components/App.tsx"

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
    "src/params.ts",
    "src/index.css",
    "src/main.tsx",
    "src/components/App.tsx",
    "src/components/Post.tsx",
    "src/jsx/app.tsx",
    "src/jsx/comment.tsx",
    "src/jsx/feed.tsx",
    "src/jsx/post.tsx",
    "src/jsx/reply.tsx",
    "src/jsx/session.tsx",
    "src/utils.tsx"
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
