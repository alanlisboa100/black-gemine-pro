export const esc={
  reset:"\x1b[0m",bold:"\x1b[1m",dim:"\x1b[2m",italic:"\x1b[3m",underline:"\x1b[4m",
  clear:"\x1b[2J\x1b[H",clearLine:"\x1b[2K",hideCursor:"\x1b[?25l",showCursor:"\x1b[?25h",
  save:"\x1b7",restore:"\x1b8",altOn:"\x1b[?1049h",altOff:"\x1b[?1049l",
  mouseOn:"\x1b[?1000h\x1b[?1002h\x1b[?1006h",mouseOff:"\x1b[?1006l\x1b[?1002l\x1b[?1000l"
};
export const fg={black:30,red:31,green:32,yellow:33,blue:34,magenta:35,cyan:36,white:37};
export function c(code,text){return `\x1b[${code}m${text}${esc.reset}`;}
export function rgb256(n,text){return `\x1b[38;5;${n}m${text}${esc.reset}`;}
export function cursorUp(n=1){return `\x1b[${n}A`;}export function cursorDown(n=1){return `\x1b[${n}B`;}
