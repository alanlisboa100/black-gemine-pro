import {exists,readText} from "./common.js";

export function detectRust(cwd) {
  if (!exists(cwd, "Cargo.toml")) return null;
  const cargo = readText(cwd, "Cargo.toml").toLowerCase();
  const frameworks = [];
  for (const name of ["tokio","axum","actix-web","rocket","tauri","bevy"]) {
    if (cargo.includes(name)) frameworks.push(name);
  }
  return {
    ecosystem: "rust",
    packageManager: "cargo",
    frameworks,
    verification: ["cargo fmt --check", "cargo check", "cargo test"],
  };
}
