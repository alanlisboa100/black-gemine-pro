import {exists,readText} from "./common.js";

export function detectGo(cwd) {
  if (!exists(cwd, "go.mod")) return null;
  const mod = readText(cwd, "go.mod");
  const frameworks = [];
  for (const [name,needle] of [
    ["gin","github.com/gin-gonic/gin"],
    ["echo","github.com/labstack/echo"],
    ["fiber","github.com/gofiber/fiber"],
  ]) if (mod.includes(needle)) frameworks.push(name);
  return {
    ecosystem:"go",
    module:(mod.match(/^module\s+(.+)$/m)||[])[1]||null,
    frameworks,
    verification:["go test ./...", "go vet ./..."],
  };
}
