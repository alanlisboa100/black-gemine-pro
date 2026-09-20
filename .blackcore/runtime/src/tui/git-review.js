import {c} from "./ansi.js";
import {box} from "./layout.js";
import {truncateToWidth} from "../utils/text.js";

export function formatGitReview(review={}){
  if(!review.ok)return box([c(220,`◇ ${review.reason||"review unavailable"}`)],{title:"GIT REVIEW",max:96});
  const changed=review.files.length,untracked=review.untracked?.length||0;
  const rows=[
    `${c(51,"◆")} ${c(244,"branch:")} ${review.branch}  ${c(244,"scope:")} ${review.scope}`,
    `${c(244,"tracked:")} ${changed} file${changed===1?"":"s"}  ${c(82,`+${review.added||0}`)} ${c(196,`-${review.removed||0}`)}  ${untracked?c(220,`· ${untracked} untracked`):""}`,
    review.checkOk?`${c(82,"✓")} ${c(244,"diff check:")} no whitespace errors`:`${c(220,"◇")} ${c(244,"diff check:")} ${truncateToWidth(review.checkOutput||"warnings found",64)}`
  ];
  for(const file of (review.files||[]).slice(0,10))rows.push(`  ${c(82,`+${file.added}`)} ${c(196,`-${file.removed}`)} ${file.path}`);
  for(const file of (review.untracked||[]).slice(0,6))rows.push(`  ${c(220,"?")} ${file} ${c(240,"(untracked)")}`);
  if(changed>10||untracked>6)rows.push(c(240,"… additional files omitted; use /review full or git diff."));
  return box(rows,{title:"GIT REVIEW",max:96});
}

export function formatWorktreePanel(items=[]){
  const rows=items.length?items.slice(0,12).map((x,i)=>`${i===0?c(82,"◆"):c(51,"◇")} ${x.branch|| (x.detached?"detached":"bare")} ${c(244,"·")} ${x.path}`):[c(220,"◇ no worktrees found")];
  if(items.length>12)rows.push(c(240,`… ${items.length-12} additional worktrees omitted`));
  return box(rows,{title:"GIT WORKTREES",max:96});
}

export function colorDiffPatch(patch=""){
  return String(patch).split(/\r?\n/).map(line=>line.startsWith("+++")||line.startsWith("---")?c(244,line):line.startsWith("+")?c(82,line):line.startsWith("-")?c(196,line):line.startsWith("@@")?c(51,line):line).join("\n");
}
