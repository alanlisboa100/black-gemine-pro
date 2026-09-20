import {spawn} from "node:child_process";
import {EventEmitter} from "node:events";
import {shortId} from "../../utils/id.js";

function marker(id) {
  return `__BLACKCORE_CMD_${id}__`;
}

export class PersistentShell extends EventEmitter {
  constructor({
    cwd = process.cwd(),
    shell = process.env.SHELL || "sh",
    env = process.env,
    maxBufferChars = 500000,
  } = {}) {
    super();
    this.cwd = cwd;
    this.shell = shell;
    this.env = env;
    this.maxBufferChars = maxBufferChars;
    this.process = null;
    this.stdout = "";
    this.stderr = "";
    this.queue = [];
    this.active = null;
    this.closed = false;
  }

  open() {
    if (this.process) return this;
    this.process = spawn(this.shell, [], {
      cwd: this.cwd,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");

    this.process.stdout.on("data", chunk => {
      this.stdout = this._cap(this.stdout + chunk);
      this._consume("stdout", chunk);
    });

    this.process.stderr.on("data", chunk => {
      this.stderr = this._cap(this.stderr + chunk);
      this._consume("stderr", chunk);
    });

    this.process.on("error", error => {
      this.emit("error", error);
      this._failActive(error);
    });

    this.process.on("close", (code, signal) => {
      this.closed = true;
      this.emit("close", {code, signal});
      this._failActive(
        new Error(`persistent shell closed (code=${code}, signal=${signal})`)
      );
      for (const job of this.queue.splice(0)) {
        job.reject(new Error("persistent shell closed"));
      }
    });

    return this;
  }

  _cap(text) {
    return text.length > this.maxBufferChars
      ? text.slice(-this.maxBufferChars)
      : text;
  }

  _failActive(error) {
    if (!this.active) return;
    clearTimeout(this.active.timer);
    this.active.signal?.removeEventListener("abort", this.active.abort);
    this.active.reject(error);
    this.active = null;
    this._next();
  }

  _consume(stream, chunk) {
    if (!this.active) return;
    if (stream === "stdout") this.active.stdout += chunk;
    else this.active.stderr += chunk;

    const end = marker(this.active.id);
    const re = new RegExp(
      `${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(-?\\d+)`
    );

    const match = this.active.stdout.match(re);
    if (!match) return;

    const code = Number(match[1]);
    const stdout = this.active.stdout
      .slice(0, match.index)
      .replace(/\n?$/, "");

    const stderr = this.active.stderr.replace(/\n?$/, "");
    const job = this.active;

    clearTimeout(job.timer);
    job.signal?.removeEventListener("abort", job.abort);
    this.active = null;

    job.resolve({
      code,
      stdout,
      stderr,
      combined: stdout + (stderr ? `\n[stderr]\n${stderr}` : ""),
    });

    this._next();
  }

  _next() {
    if (this.active || !this.queue.length || this.closed) return;

    const job = this.queue.shift();
    this.active = job;
    const end = marker(job.id);

    // The marker is emitted only after the requested command finishes.
    const wrapped = [
      `{`,
      job.command,
      `}`,
      `__bc_code=$?`,
      `printf '\\n${end}:%s\\n' "$__bc_code"`,
      "",
    ].join("\n");

    job.abort = () => {
      try {
        this.process.kill("SIGINT");
      } catch {}
    };

    if (job.signal) {
      if (job.signal.aborted) {
        this.active = null;
        job.reject(job.signal.reason || new Error("aborted"));
        this._next();
        return;
      }
      job.signal.addEventListener("abort", job.abort, {once: true});
    }

    job.timer = job.timeoutMs > 0
      ? setTimeout(() => {
          try {
            this.process.kill("SIGINT");
          } catch {}
          const error = new Error(
            `persistent shell command timed out after ${job.timeoutMs}ms`
          );
          this._failActive(error);
        }, job.timeoutMs)
      : null;

    this.process.stdin.write(wrapped);
  }

  run(command, {
    timeoutMs = 60000,
    signal = null,
  } = {}) {
    if (this.closed) {
      return Promise.reject(new Error("persistent shell is closed"));
    }

    this.open();

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: shortId(),
        command,
        timeoutMs,
        signal,
        resolve,
        reject,
        stdout: "",
        stderr: "",
        timer: null,
        abort: null,
      });
      this._next();
    });
  }

  async cd(directory, opts = {}) {
    const quoted = `'${String(directory).replace(/'/g, `'\\''`)}'`;
    const result = await this.run(`cd ${quoted} && pwd`, opts);
    if (result.code === 0 && result.stdout.trim()) {
      this.cwd = result.stdout.trim().split(/\r?\n/).at(-1);
    }
    return result;
  }

  tail(chars = 20000) {
    return {
      stdout: this.stdout.slice(-chars),
      stderr: this.stderr.slice(-chars),
      cwd: this.cwd,
      pid: this.process?.pid || null,
      closed: this.closed,
      queued: this.queue.length,
      busy: !!this.active,
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.process?.stdin.end("exit\n");
    } catch {}
    try {
      this.process?.kill("SIGTERM");
    } catch {}
    this.process = null;
  }
}

export class ShellSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  open(name, options) {
    if (this.sessions.has(name)) {
      throw new Error(`shell session already exists: ${name}`);
    }
    const shell = new PersistentShell(options).open();
    this.sessions.set(name, shell);
    return shell;
  }

  get(name) {
    const shell = this.sessions.get(name);
    if (!shell) throw new Error(`shell session not found: ${name}`);
    return shell;
  }

  list() {
    return [...this.sessions.entries()].map(([name, shell]) => ({
      name,
      ...shell.tail(0),
    }));
  }

  close(name) {
    const shell = this.get(name);
    shell.close();
    this.sessions.delete(name);
    return true;
  }

  closeAll() {
    for (const shell of this.sessions.values()) shell.close();
    this.sessions.clear();
  }
}
