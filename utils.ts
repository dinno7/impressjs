import fs from "fs/promises";
import http from "http";
import mime from "mime";

export function setResponseStatus(
  this: http.ServerResponse<http.IncomingMessage>,
  statusCode: number,
): http.ServerResponse<http.IncomingMessage> {
  this.statusCode = statusCode;
  return this;
}

export async function sendFileResponse(
  this: http.ServerResponse<http.IncomingMessage>,
  filePath: string,
) {
  const mediaType = mime.getType(filePath);
  const fh = await fs.open(filePath, "r");
  const fRStream = fh.createReadStream();

  this.setHeader("Content-Type", mediaType);

  fRStream.pipe(this);
}

export function sendResponseAsJson(
  this: http.ServerResponse<http.IncomingMessage>,
  data: Record<string | number, any>,
) {
  try {
    const stringData = JSON.stringify(data);

    this.setHeader("Content-Type", "application/json");
    this.end(stringData);
  } catch (e) {
    throw new Error("The type of data must be an object");
  }
}

export function parseBody(this: http.IncomingMessage) {
  return new Promise((resolve, reject) => {
    this.body = [];
    this.on("data", (chunk: Buffer) => {
      this.body.push(chunk);
    }).on("end", () => {
      this.body = Buffer.concat(this?.body || []).toString("utf-8");
      try {
        const parsedJson = JSON.parse(this.body);
        this.body = parsedJson;
        resolve(this.body);
      } catch (e) {
        resolve("");
      }
    });
  });
}
