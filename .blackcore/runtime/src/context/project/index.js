import {detectNode} from "./node.js";
import {detectPython} from "./python.js";
import {detectRust} from "./rust.js";
import {detectGo} from "./go.js";
import {detectAndroid} from "./android.js";
import {detectDeploy} from "./deploy.js";
import {detectCI} from "./ci.js";
import {detectWeb} from "./web.js";
import {detectPhp} from "./php.js";
import {detectFlutter} from "./flutter.js";

export function detectProject(cwd) {
  const ecosystems = [
    detectNode(cwd),
    detectPython(cwd),
    detectRust(cwd),
    detectGo(cwd),
    detectAndroid(cwd),
    detectFlutter(cwd),
    detectPhp(cwd),
    detectWeb(cwd),
  ].filter(Boolean);

  const deploy = detectDeploy(cwd);
  const ci = detectCI(cwd);
  const verification = [...new Set(ecosystems.flatMap(x => x.verification || []))];

  return {
    cwd,
    ecosystems,
    deploy,
    ci,
    verification,
    primary: ecosystems[0]?.ecosystem || "unknown",
  };
}
