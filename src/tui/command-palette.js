import {selectMenu} from "./select-menu.js";

export const COMMAND_ITEMS=[
  {command:"models",label:"/models",description:"provider → model → reasoning"},
  {command:"plan",label:"/plan",description:"analysis mode — no file changes"},
  {command:"act",label:"/act",description:"implementation mode"},
  {command:"work",label:"/work",description:"adaptive work protocol and evidence"},
  {command:"quit",label:"/quit",description:"exit BLACKCORE"}
];
export async function commandPalette(app){const r=await selectMenu(app.input,"BLACKCORE Controls",COMMAND_ITEMS,{subtitle:"Talk naturally for every task. These shortcuts only control model, mode or exit."});return r?.item?.command||null;}
