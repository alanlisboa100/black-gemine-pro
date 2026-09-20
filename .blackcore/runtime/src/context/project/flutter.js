import {exists,readText} from "./common.js";

export function detectFlutter(cwd){
  if(!exists(cwd,"pubspec.yaml"))return null;
  const pubspec=readText(cwd,"pubspec.yaml"),flutter=/^\s*flutter\s*:/m.test(pubspec),frameworks=[];
  if(flutter)frameworks.push("flutter");if(/^\s*flame\s*:/m.test(pubspec))frameworks.push("flame");
  return {ecosystem:"flutter",packageManager:"pub",frameworks,verification:["flutter analyze","flutter test"]};
}
