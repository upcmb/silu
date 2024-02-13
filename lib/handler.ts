import {
  Auth,
  AuthType,
  Request,
  safeClose,
  timeoutConn,
  timeoutFetch,
} from "./mod.ts";

import type { Logger } from "./mod.ts";

export async function handler(
  incomeConn: Deno.Conn,
  auth: AuthType,
  timeout: number,
  logger: Logger,
) {
  const income = incomeConn.remoteAddr as Deno.NetAddr;
  const reader = incomeConn.readable.getReader();

  const request = await new Request(reader).parse();
  if (!request) return safeClose(incomeConn);

  const ctrl = new AbortController();
  const { signal } = ctrl;
  const encoder = new TextEncoder();

  const method = request.method;
  const target = request.target!;

  switch (method) {
    case "CONNECT":
      try {
        await new Auth(request, incomeConn, auth).auth();
        await tunnel();
      } catch (e) {
        logger.warn(
          `Tunnel: ${income.hostname}:${income.port} == ${target.hostname}:${target.port} failed , ${e}`,
        );
      } finally {
        safeClose(incomeConn);
      }
      break;

    default:
      try {
        await new Auth(request, incomeConn, auth).auth();
        await proxy();
      } catch (e) {
        logger.warn(
          `Proxy : ${income.hostname}:${income.port} -> ${target.hostname}:${target.port} failed , ${e}`,
        );
      } finally {
        safeClose(incomeConn);
      }
  }

  async function tunnel() {
    reader.releaseLock();

    using targetConn = await timeoutConn(Deno.connect(target), timeout);

    await incomeConn.write(
      encoder.encode("HTTP/1.1 200 Connection established\r\n\r\n"),
    );

    logger.info(
      `Tunnel: ${income.hostname}:${income.port} == ${target.hostname}:${target.port}`,
    );

    await Promise.all([
      incomeConn.readable.pipeTo(targetConn.writable, { signal }),
      targetConn.readable.pipeTo(incomeConn.writable, { signal }),
    ]).catch(() => ctrl.abort());
  }

  async function proxy() {
    const { headers, method, body } = request!;

    headers.delete("Proxy-Authorization");

    const res = await timeoutFetch(
      fetch(target.url!, {
        redirect: "manual",
        method,
        headers,
        signal,
        body: body ? body : null,
      }),
      timeout,
      ctrl,
    );

    logger.info(
      `Proxy : ${income.hostname}:${income.port} -> ${target.hostname}:${target.port}`,
    );

    const { status, statusText } = res;
    const resArray = [`HTTP/1.1 ${status} ${statusText}`];
    for (const [k, v] of res.headers.entries()) {
      if (k === "transfer-encoding") continue;
      resArray.push(["\r\n", k, ": ", v].join(""));
    }
    resArray.push("\r\n\r\n");
    const resHead = resArray.join("");

    await incomeConn.write(encoder.encode(resHead));

    if (res.body) {
      await res.body.pipeTo(incomeConn.writable, { signal }).catch(() =>
        ctrl.abort()
      );
    }
  }
}
