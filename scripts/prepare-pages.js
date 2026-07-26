const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");

if (!fs.existsSync(indexPath)) {
  throw new Error("dist/index.html が見つかりません。先に expo export -p web を実行してください。");
}

fs.copyFileSync(indexPath, notFoundPath);
