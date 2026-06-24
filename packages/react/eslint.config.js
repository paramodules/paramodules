import baseConfig from "@config.typectx/eslint"
import { defineConfig } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"

export default defineConfig([
    ...baseConfig,
    reactHooks.configs.flat["recommended-latest"]
])
