import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
	build: {
		command: "npm run build",
	},
	types: {
		generate: false,
	},
	assetsDirectory: "./dist",
});
