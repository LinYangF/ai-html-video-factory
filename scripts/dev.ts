import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHtml } from "../src/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4173);

await buildHtml();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = resolveFile(pathname);

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const info = await stat(filePath);
  if (!info.isFile()) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  response.writeHead(200, { "content-type": contentType(filePath) });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}/`);
  console.log(`Open http://localhost:${port}/preview.html`);
});

function resolveFile(pathname: string): string | null {
  if (pathname === "/" || pathname === "/preview.html") {
    return path.join(rootDir, "output", "current", "preview.html");
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const outputPath = path.join(rootDir, "output", "current", safePath);
  if (outputPath.startsWith(path.join(rootDir, "output", "current"))) {
    return outputPath;
  }

  return null;
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
