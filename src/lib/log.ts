import pc from 'picocolors';

export const log = {
  info: (msg: string) => console.log(pc.cyan('•'), msg),
  ok: (msg: string) => console.log(pc.green('✓'), msg),
  warn: (msg: string) => console.log(pc.yellow('!'), msg),
  err: (msg: string) => console.error(pc.red('✗'), msg),
  step: (msg: string) => console.log(pc.bold(pc.magenta('→')), pc.bold(msg)),
  dim: (msg: string) => console.log(pc.dim(msg)),
  raw: (msg: string) => console.log(msg),
};
