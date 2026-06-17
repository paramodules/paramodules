import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"
import { githubNavbarHtml, npmNavbarHtml } from "./navbarIcons"

const config: Config = {
    title: "paramodules",
    tagline:
        "Stateless, parametrizable runtime modules for cascading TypeScript applications.",
    favicon: "img/paramodules-logo.png",

    future: {
        v4: true
    },

    url: "https://paramodules.github.io",
    baseUrl: "/core/",

    organizationName: "paramodules",
    projectName: "paramodules",

    onBrokenLinks: "throw",

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
        colorMode: {
            defaultMode: "dark",
            disableSwitch: true,
            respectPrefersColorScheme: false
        },
        navbar: {
            logo: {
                alt: "paramodules home",
                src: "img/paramodules-logo.png",
                width: 32,
                height: 32
            },
            items: [
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
