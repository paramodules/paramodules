import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: "typectx",
    tagline: "Fully type-inferred Context and DI container for Typescript",
    favicon: "img/typectx-logo.png",

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "https://typectx.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/typectx/",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "typectx", // Usually your GitHub org/user name.
    projectName: "typectx", // Usually your repo name.

    onBrokenLinks: "throw",

    markdown: {
        hooks: {
            onBrokenMarkdownLinks: "warn"
        }
    },

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        "https://github.com/typectx/typectx/tree/main/packages/docs/"
                },
                theme: {
                    customCss: "./src/css/custom.css"
                },
                blog: {
                    blogTitle: "typectx's Blog",
                    blogDescription: "News, releases, and more!",
                    blogSidebarCount: "ALL",
                    blogSidebarTitle: "News, releases, and more!"
                }
            } satisfies Preset.Options
        ]
    ],
    scripts: [
        {
            src: "https://scripts.simpleanalyticscdn.com/latest.js",
            async: true
        }
    ],
    themeConfig: {
        colorMode: {
            defaultMode: "dark",
            disableSwitch: true,
            respectPrefersColorScheme: false
        },
        // Replace with your project's social card
        image: "img/typectx-logo.png",
        navbar: {
            title: "typectx",
            logo: {
                alt: "typectx Logo",
                src: "img/typectx-logo.png"
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "sidebar",
                    position: "left",
                    label: "Docs"
                },
                {
                    to: "blog",
                    label: "Blog",
                    position: "left"
                },
                {
                    href: "https://www.npmjs.com/package/typectx",
                    label: "npm",
                    position: "right",
                    "aria-label": "Visit typectx on npm (opens in new tab)"
                },
                {
                    href: "https://github.com/typectx/typectx",
                    label: "GitHub",
                    position: "right",
                    "aria-label": "Visit typectx on GitHub (opens in new tab)"
                }
            ]
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/docs/getting-started"
                        },
                        {
                            label: "API Reference",
                            to: "/docs/api-reference"
                        }
                    ]
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "GitHub Issues",
                            href: "https://github.com/typectx/typectx/issues"
                        },
                        {
                            label: "GitHub Discussions",
                            href: "https://github.com/typectx/typectx/discussions"
                        }
                    ]
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "npm Package",
                            href: "https://www.npmjs.com/package/typectx"
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/typectx/typectx"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} typectx. Built with Docusaurus.`
        },
        prism: {
            theme: prismThemes.jettwaveDark,
            darkTheme: prismThemes.jettwaveDark,
            additionalLanguages: ["typescript", "tsx", "javascript", "jsx"]
        }
    } satisfies Preset.ThemeConfig
}

export default config
