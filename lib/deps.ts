export function safeClose(...conns: Deno.Conn[]) {
  conns.forEach((v) => {
    try {
      v.close();
      // deno-lint-ignore no-empty
    } catch (_) {}
  });
}

class TimeoutError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "Timeout";
  }
}

export function timeoutConn(
  promise: Promise<Deno.TcpConn>,
  ms: number,
): Promise<Deno.TcpConn> {
  let timer: number | undefined;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  }).then(() => {
    promise.then(safeClose).catch(() => {});
    throw new TimeoutError("Connection timed out after " + ms + " ms");
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function timeoutFetch(
  promise: Promise<Response>,
  ms: number,
  ctrl: AbortController,
): Promise<Response> {
  let timer: number | undefined;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  }).then(() => {
    ctrl.abort();
    throw new TimeoutError("Fetch timed out after " + ms + " ms");
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
