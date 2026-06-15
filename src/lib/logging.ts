const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

export function ok(msg: string): void {
  console.error(`${COLORS.green}  OK${COLORS.reset}: ${msg}`);
}

export function fail(msg: string): void {
  console.error(`${COLORS.red}FAIL${COLORS.reset}: ${msg}`);
}

export function warn(msg: string): void {
  console.error(`${COLORS.yellow}WARN${COLORS.reset}: ${msg}`);
}

export function info(msg: string): void {
  console.error(`${COLORS.cyan}INFO${COLORS.reset}: ${msg}`);
}

export function dim(msg: string): void {
  console.error(`${COLORS.dim}${msg}${COLORS.reset}`);
}

export function header(msg: string): void {
  console.error(`\n${msg}`);
  console.error("─".repeat(msg.length));
}
