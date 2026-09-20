import crypto from "node:crypto";
export function id(prefix=""){return prefix+crypto.randomUUID().replace(/-/g,"");}
export function shortId(prefix=""){return prefix+crypto.randomBytes(5).toString("hex");}
export function hash(input){return crypto.createHash("sha256").update(input).digest("hex");}
