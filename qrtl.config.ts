import { defineQrtlConfig } from "@quartal/plugin";

// Plugin metadata and options — see https://plugin.quartal.com for the full reference.
export default defineQrtlConfig({
  title: "Easor Plugin",
  description: "A Quartal Plugin.",
  // Auth mode: "anon" (no authentication), "quartal-hub" (OAuth2 via Quartal Hub), or
  // "custom" (your own OAuth2 / OIDC server).
  auth: "anon",
  // Logo and icons shown by MCP clients and the docs site:
  // style: {
  //   logo: "https://example.com/logo.png",
  //   icons: [{ src: "https://example.com/icon.png", mimeType: "image/png", sizes: ["128x128"] }],
  // },
  // Publishing to Quartal Hub:
  // deploy: { org: "my-org", app: "easor-plugin" },
});
