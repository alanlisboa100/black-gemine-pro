import fs from "node:fs";
import path from "node:path";
import {exists} from "./common.js";

export function detectCI(cwd) {
  const systems = [];
  const workflows = [];
  const gh = path.join(cwd, ".github", "workflows");
  if (fs.existsSync(gh)) {
    systems.push("github-actions");
    for (const e of fs.readdirSync(gh)) {
      if (/\.ya?ml$/i.test(e)) workflows.push(`.github/workflows/${e}`);
    }
  }
  if (exists(cwd, ".gitlab-ci.yml")) systems.push("gitlab-ci");
  if (exists(cwd, "circle.yml") || exists(cwd, ".circleci/config.yml")) systems.push("circleci");
  if (exists(cwd, "Jenkinsfile")) systems.push("jenkins");
  return {systems, workflows};
}
