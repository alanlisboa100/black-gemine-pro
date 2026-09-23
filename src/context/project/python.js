import {exists,readText} from "./common.js";

function namesFromRequirements(text) {
  return text.split(/\r?\n/)
    .map(x => x.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map(x => x.split(/[<>=!~\[]/, 1)[0].trim().toLowerCase());
}

export function detectPython(cwd) {
  if (!exists(cwd, "pyproject.toml") &&
      !exists(cwd, "requirements.txt") &&
      !exists(cwd, "setup.py") &&
      !exists(cwd, "Pipfile")) return null;

  const pyproject = readText(cwd, "pyproject.toml");
  const requirements = namesFromRequirements(readText(cwd, "requirements.txt"));
  const all = (pyproject.toLowerCase() + "\n" + requirements.join("\n"));
  const frameworks = [];
  for (const [name, needle] of [
    ["django", "django"],
    ["fastapi", "fastapi"],
    ["flask", "flask"],
    ["pytest", "pytest"],
    ["poetry", "[tool.poetry]"],
    ["uv", "[tool.uv]"],
  ]) if (all.includes(needle)) frameworks.push(name);

  const manager =
    exists(cwd, "uv.lock") ? "uv" :
    exists(cwd, "poetry.lock") ? "poetry" :
    exists(cwd, "Pipfile.lock") ? "pipenv" :
    "pip";

  const verification = [];
  if (frameworks.includes("pytest") || exists(cwd, "pytest.ini")) verification.push("python -m pytest");
  if (pyproject.includes("[tool.ruff")) verification.push("python -m ruff check .");
  if (pyproject.includes("[tool.mypy")) verification.push("python -m mypy .");

  return {ecosystem:"python", packageManager:manager, frameworks, verification};
}
