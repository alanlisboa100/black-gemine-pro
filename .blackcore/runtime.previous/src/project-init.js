import fs from "node:fs";
import path from "node:path";
const AGENTS=`# BLACKCORE project instructions

## Repository expectations

- Inspect the relevant implementation and nearby tests before editing.
- Preserve existing architecture, public behavior, and unrelated user work unless the task requires a change.
- For multi-step work, keep a short plan with explicit completion criteria.
- After edits, run the narrowest meaningful test first and then the repository's required verification command.
- Never claim a test, build, deployment, or visual behavior succeeded without tool evidence.
- Never commit secrets, generated credentials, or private user data.

## Code review rules

- Review the actual diff after broad or risky changes.
- Flag regressions, missing error paths, unsafe side effects, and unrelated edits; leave mechanical formatting checks to CI.
- A task is done only when requested behavior is implemented, relevant checks pass, and remaining limitations are stated.
`;
const SETTINGS={mode:"ACT",permissionProfile:"balanced"};
export function initProject(cwd=process.cwd()){
  const d=path.join(cwd,".blackcore");fs.mkdirSync(path.join(d,"extensions"),{recursive:true});fs.mkdirSync(path.join(d,"skills"),{recursive:true});fs.mkdirSync(path.join(d,"prompts"),{recursive:true});fs.mkdirSync(path.join(d,"themes"),{recursive:true});
  const agents=path.join(cwd,"AGENTS.md");if(!fs.existsSync(agents))fs.writeFileSync(agents,AGENTS,"utf8");
  const settings=path.join(d,"settings.json");if(!fs.existsSync(settings))fs.writeFileSync(settings,JSON.stringify(SETTINGS,null,2)+"\n","utf8");
  return d;
}
