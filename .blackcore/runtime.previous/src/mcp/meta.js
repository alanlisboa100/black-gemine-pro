import {VERSION} from "../config/defaults.js";
export const MCP_CURRENT_VERSION="2026-07-28";
export const MCP_LEGACY_VERSION="2025-11-25";
export function requestMeta(version=MCP_CURRENT_VERSION){return {"io.modelcontextprotocol/protocolVersion":version,"io.modelcontextprotocol/clientInfo":{name:"BLACKCORE Native",version:VERSION},"io.modelcontextprotocol/clientCapabilities":{}};}
export function withMeta(params={},version=MCP_CURRENT_VERSION){return {...(params||{}),_meta:{...(params?._meta||{}),...requestMeta(version)}};}
export function encodeHeaderValue(value){const s=String(value);const safe=/^[\x20-\x7E]+$/.test(s)&&s.trim()===s&&!/^=\?base64\?.*\?=$/.test(s);return safe?s:`=?base64?${Buffer.from(s,"utf8").toString("base64")}?=`;}
