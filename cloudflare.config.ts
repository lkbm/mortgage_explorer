import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "mortgage-explorer",
		compatibilityDate: "2024-01-01",
		entrypoint: "src/main.tsx",
		assets: {
			notFoundHandling: "404-page",
		},
		env: {
			mortgage_explorer: bindings.kv({
				id: "fcf500d9f73f4502aac080d45a7f2967",
			}),
		},
	},
});
