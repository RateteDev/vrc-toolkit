import { defineConfig } from "wxt";

// Chrome builds as MV3 and Firefox as MV2 via WXT defaults; the two manifests
// are not shared. Host permission is scoped to vrchat.com only because the
// extension rides the user's existing vrchat.com session and holds no
// credentials of its own.
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "VRC Toolkit",
    description: "VRChat の非公式 API を利用した個人向けツールキット。",
    action: {},
    host_permissions: ["https://vrchat.com/*"],
  },
});
