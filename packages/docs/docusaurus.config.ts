import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"
import { githubNavbarHtml, npmNavbarHtml } from "./navbarIcons"
import simpleAnalyticsPlugin from "./simpleAnalyticsPlugin"

const config: Config = {
    title: "Paramodules — Request-time module primitive — Pure, fully type-inferred, containerless and request-scoped dependency injection for complex, cascading and deeply-nested Typescript application architecture",
    tagline:
        "Parametrizable module primitives for any TypeScript stack — define modules, request them with dynamic params at the entry point, and control cascades through a fully inferred dependency graph.",
    favicon: "img/paramodules-logo.png",

    future: {
        v4: true
    },

    url: "https://paramodules.github.io",
    baseUrl: "/paramodules/",

    organizationName: "paramodules",
    projectName: "paramodules",

    onBrokenLinks: "throw",

    plugins: [simpleAnalyticsPlugin],

    markdown: {
        hooks: {
            onBrokenMarkdownLinks: "warn"
        }
    },

    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },

    presets: [
        [
            "classic",
            {
                docs: false,
                blog: {
                    blogTitle: "Blog",
                    blogDescription: "News, releases, and more!",
                    blogSidebarCount: "ALL"
                },
                theme: {
                    customCss: "./src/css/custom.css"
                }
            } satisfies Preset.Options
        ]
    ],

    themeConfig: {
        image: "img/paramodules-logo.png",
        colorMode: {
            defaultMode: "dark",
            disableSwitch: true,
            respectPrefersColorScheme: false
        },
        navbar: {
            title: "paramodules",
            logo: {
                alt: "paramodules home",
                src: "img/paramodules-logo.png",
                width: 32,
                height: 32
            },
            items: [
                {
                    type: "custom-openExample",
                    position: "right"
                },
                {
                    to: "blog",
                    label: "Blog",
                    position: "right"
                },
                {
                    type: "html",
                    position: "right",
                    value: npmNavbarHtml
                },
                {
                    type: "html",
                    position: "right",
                    value: githubNavbarHtml
                }
            ]
        },
        footer: {
            style: "dark",
            copyright: `Copyright (c) ${new Date().getFullYear()} paramodules. Built with Docusaurus.`
        },
        prism: {
            theme: prismThemes.jettwaveDark,
            darkTheme: prismThemes.jettwaveDark,
            additionalLanguages: ["typescript", "tsx", "javascript", "jsx"]
        }
    } satisfies Preset.ThemeConfig
}

export default config
