import { MuxAsyncIterator } from "jsr:@std/async/mux-async-iterator";
import type { Logger } from "jsr:@deno-lib/logger@^1.1.6";

type HttpsConfig = {
  port?: number | undefined;
  crt?: string | undefined;
  key?: string | undefined;
} | undefined;

type HttpConfig = {
  port?: number | undefined;
} | undefined;

type LoggerOption = {
  mode: "disable" | "console" | "file" | "both";
  level: "info" | "warn" | "error";
  dir: string;
  rotate: boolean;
  maxBytes?: number | undefined;
  maxBackupCount?: number | undefined;
};

export async function configure(
  http: HttpConfig,
  https: HttpsConfig,
  logger: Logger,
  loggerOption: LoggerOption,
  bind: string,
) {
  if (loggerOption.mode === "both" || loggerOption.mode === "file") {
    const { maxBackupCount, maxBytes, rotate } = loggerOption;
    await logger.initFileLogger(loggerOption.dir, {
      maxBackupCount,
      maxBytes,
      rotate,
    });
  }

  let httpServer;
  let httpsServer;
  if (http?.port !== undefined) {
    httpServer = Deno.listen({ port: http.port, hostname: bind });
    const addr = <Deno.NetAddr> httpServer.addr;
    logger.info(`HTTP server is listening on ${addr.hostname}:${addr.port}`);
  }

  if (https) {
    const { port, crt, key } = https;
    if (port && crt && key) {
      const [c, k] = await Promise.all([
        Deno.readTextFile(crt),
        Deno.readTextFile(key),
      ]);
      httpsServer = Deno.listenTls({ port, cert: c, key: k, hostname: bind });
      const addr = <Deno.NetAddr> httpsServer.addr;
      logger.info(`HTTPS server is listening on ${addr.hostname}:${addr.port}`);
    }
  }

  logger.disable();

  switch (loggerOption.mode) {
    case "disable":
      logger.disableConsole();
      logger.disableFile();
      break;

    case "file":
      setLogLevel(logger, loggerOption.level);
      logger.disableConsole();
      logger.enableFile();
      break;

    case "console":
      setLogLevel(logger, loggerOption.level);
      logger.enableConsole();
      logger.disableFile();
      break;

    case "both":
      setLogLevel(logger, loggerOption.level);
      logger.enableConsole();
      logger.enableFile;
      break;
  }
  const listener = new MuxAsyncIterator<Deno.Conn>();
  httpServer && listener.add(httpServer);
  httpsServer && listener.add(httpsServer);

  return listener;
}

function setLogLevel(logger: Logger, level: "info" | "warn" | "error") {
  switch (level) {
    case "info":
      logger.enable("info");
      logger.enable("warn");
      logger.enable("error");
      break;
    case "warn":
      logger.enable("warn");
      logger.enable("error");
      break;
    case "error":
      logger.enable("error");
      break;
  }
}
