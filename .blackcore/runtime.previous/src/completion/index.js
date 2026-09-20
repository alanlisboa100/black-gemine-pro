const SUB=["config","doctor","init","login","logout","package","rpc","version","completion"];
const SLASH=["help","model","models","thinking","effort","work","language","settings","permissions","tools","tool","reload","doctor","new","resume","resume-task","sessions","name","session","usage","tree","session-check","session-repair","jump","fork","clone","label","compact","export","export-json","import","plan","act","context","skills","skill","unskill","prompts","prompt","todos","graph","task-graph","checkpoints","undo","processes","extensions","trust","mcp","packages","package-install","package-remove","copy","paste","editor","anim","source","quit"];
export function completion(shell="bash"){
 if(shell==="bash")return `_blackcore_complete(){ local cur="${'${COMP_WORDS[COMP_CWORD]}'}"; if [[ ${'${COMP_CWORD}'} -eq 1 ]]; then COMPREPLY=( $(compgen -W "${SUB.join(" ")}" -- "$cur") ); else COMPREPLY=(); fi; }\ncomplete -F _blackcore_complete blackcore\n`;
 if(shell==="zsh")return `#compdef blackcore\n_arguments '1:command:(${SUB.join(" ")})' '*::args:->args'\n`;
 if(shell==="fish")return SUB.map(x=>`complete -c blackcore -f -n '__fish_use_subcommand' -a '${x}'`).join("\n")+"\n";
 throw new Error("supported shells: bash, zsh, fish");
}
export const slashCommands=SLASH;
