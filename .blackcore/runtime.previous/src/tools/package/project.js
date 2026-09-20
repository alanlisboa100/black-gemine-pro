import {defineTool} from "../registry.js";
import {detectProject} from "../../context/project/index.js";

export const projectDetectTool = defineTool({
  name: "project_detect",
  description: "Detect project ecosystems, frameworks, package managers, deploy configuration, CI, and verification commands.",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute(_args, ctx) {
    return JSON.stringify(detectProject(ctx.cwd), null, 2);
  },
});
