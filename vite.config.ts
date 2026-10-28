import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), {
    name: "local-shelf-preview-export",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/blockmeet/__shelf-previews" || req.method !== "POST") return next();
        // This dev-only endpoint accepts only same-origin renders and fixed asset paths.
        if (req.headers.origin !== `http://${req.headers.host}`) { res.statusCode = 403; res.end(); return; }
        try {
          let body = "";
          for await (const chunk of req) { body += chunk; if (body.length > 15_000_000) throw new Error("Export too large"); }
          const items = JSON.parse(body);
          if (!Array.isArray(items) || items.length > 500) throw new Error("Invalid collection");
          for (const item of items) if (!/^[a-z0-9]{1,16}$/.test(item.id) || typeof item.fingerprint !== "string" || !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(item.image)) throw new Error("Invalid preview");
          const directory = resolve(server.config.root, "public/library/shelf-previews");
          await mkdir(directory, { recursive: true });
          const manifest: Record<string, { fingerprint: string; image: string }> = {};
          for (const item of items) {
            await writeFile(resolve(directory, `${item.id}.webp`), Buffer.from(item.image.split(",")[1], "base64"));
            manifest[item.id] = { fingerprint: item.fingerprint, image: `shelf-previews/${item.id}.webp` };
          }
          await writeFile(resolve(directory, "../shelf-previews.json"), JSON.stringify(manifest, null, 2) + "\n");
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ saved: items.length }));
        } catch (error) { res.statusCode = 400; res.end(String(error)); }
      });
    },
  }],
  base: "/blockmeet/",
});
