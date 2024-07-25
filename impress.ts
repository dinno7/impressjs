import fsSync from "fs";
import http from "http";
import path from "path";
import { EventEmitter } from "stream";
import {
  parseBody,
    sendFileResponse,
    sendResponseAsJson,
    setResponseStatus,
} from "./utils";

type RouteCallback = (
  req: http.IncomingMessage,
  res: http.ServerResponse<http.IncomingMessage>,
) => any;

declare module "http" {
  interface IncomingMessage {
    body?: any;
  }
  interface ServerResponse {
    status: (statusCode: number) => ServerResponse;
    sendFile: (filePath: string) => void;
    send: (data: Record<string | number, any>) => void;
    json: (data: Record<string | number, any>) => void;
  }
}

export default class Impress {
  host: string;
  port: number;
  server: http.Server;

  private _routesEvent: EventEmitter = new EventEmitter();
  private _routes = new Map<string, RouteCallback>();

  private _setNewRoute(
    method: string,
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    this._routes.set(`${method.toUpperCase()}::${route}`, cb);
  }

  private _getRouteCB(method: string = "", url?: string) {
    if (!method || !url) return undefined;
    return this._routes.get(`${method.toUpperCase()}::${url}`);
  }

  constructor(
    options: { setDefault404: boolean } = {
      setDefault404: true,
    },
  ) {
    this.server = http.createServer();
    this.host = "";
    this.port = 0;

    this.server.on("request", async (req, res) => {
      await parseBody.call(req);

      // Add more response object features
      res.status = setResponseStatus.bind(res);
      res.sendFile = sendFileResponse.bind(res);
      res.send = sendResponseAsJson.bind(res);
      res.json = sendResponseAsJson.bind(res);

      // > Event base
      //this._routesEvent.emit(
      //  `${req.method?.toUpperCase()}::${req.url}`,
      //  req,
      //  res,
      //);

      const cb = this._getRouteCB(req.method, req.url);
      if (!cb) {
        if (options.setDefault404) {
          res.statusCode = 404;
          res.end("404 Not Found!");
        }
        return;
      }

      await Promise.resolve(cb(req, res));
    });
  }

  setStatics(dirPath: string) {
    const files: string[] = fsSync.readdirSync(dirPath, {
      encoding: "utf-8",
      recursive: true,
    });

    files.forEach((file) => {
      this.route("GET", `/${file}`, (req, res) => {
        res.sendFile(path.resolve(dirPath, file));
      });
    });
  }

  route(
    method: string,
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    // > Event base
    //this._routesEvent.on(`${method.toUpperCase()}::${route}`, cb);

    this._setNewRoute(method, route, cb);
  }

  get(
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    this.route("GET", route, cb);
  }

  post(
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    this.route("POST", route, cb);
  }

  put(
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    this.route("PUT", route, cb);
  }

  delete(
    route: string,
    cb: (req: http.IncomingMessage, res: http.ServerResponse) => any,
  ) {
    this.route("DELETE", route, cb);
  }

  get address() {
    let runningAddress = "";
    if (this.host.startsWith("http://") || this.host.startsWith("https://")) {
      runningAddress = `${this.host}:${this.port}`;
    }
    runningAddress = `http://${this.host}:${this.port}`;
    return runningAddress;
  }

  listen(port: number, cb: () => void, host: string = "127.0.0.1") {
    this.port = port;
    this.host = host;

    this.server.listen(port, host, cb);
  }
}
