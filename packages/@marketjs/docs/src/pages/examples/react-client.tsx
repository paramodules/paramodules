import Layout from "@theme/Layout"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"

export default function ExampleReactClient() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <iframe
                src="https://codesandbox.io/p/sandbox/github/typectx/typectx/tree/docs/packages/@typectx/react/examples/main?embed=1&file=%2FREADME.md"
                style={{
                    width: "100%",
                    height: "90vh",
                    border: "0",
                    borderRadius: "4px",
                    overflow: "hidden"
                }}
                title="@typectx/react example"
                allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            ></iframe>
        </Layout>
    )
}
