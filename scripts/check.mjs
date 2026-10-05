import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function collect(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? collect(path) : /\.(js|mjs)$/.test(entry.name) ? [path] : [];
    });
}
const files = [...collect(join(root, "src")), join(root, "main.js"), join(root, "esbuild.config.mjs"), fileURLToPath(import.meta.url)];
for (const path of files) execFileSync(process.execPath, ["--check", path], { stdio: "inherit" });
console.log(`Syntaxe valide : ${files.length} fichiers.`);
