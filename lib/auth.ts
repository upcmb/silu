import type { Request } from "./request.ts";

export enum AuthResult {
  Pass,
  Fail,
}

export type AuthType = {
  username?: string;
  password?: string;
  type: "none" | "basic";
};

class AuthFailed extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "AuthFailed";
  }
}

export class Auth {
  private option: AuthType;
  private incomeConn: Deno.Conn;
  private request: Request;

  constructor(request: Request, incomeConn: Deno.Conn, auth: AuthType) {
    this.option = auth;
    this.incomeConn = incomeConn;
    this.request = request;
  }

  private async failed(errMsg: string) {
    const encoder = new TextEncoder();
    const res =
      `HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: ${this.option.type}\r\n\r\n`;
    await this.incomeConn.write(encoder.encode(res));
    throw new AuthFailed(errMsg);
  }

  async auth() {
    if (this.option.type === "none") return;
    const header = this.request.headers.get("Proxy-Authorization");

    if (!header) {
      await this.failed("No 'Proxy-Authorization' header");
      return;
    }

    switch (this.option.type) {
      case "basic": {
        const [result, errMsg] = this.basic(header);
        if (result === AuthResult.Fail) {
          await this.failed(errMsg.toString());
        }
        return;
      }
    }
  }

  private basic(header: string) {
    try {
      const encodedCredentials = header.split(" ")[1];
      const decodedCredentials = atob(encodedCredentials);
      const [username, password] = decodedCredentials.split(":");

      if (
        username === this.option.username && password === this.option.password
      ) {
        return [AuthResult.Pass];
      } else {
        return [AuthResult.Fail, `${decodedCredentials} mismatch`];
      }
    } catch (e) {
      return [AuthResult.Fail, e as Error];
    }
  }
}
