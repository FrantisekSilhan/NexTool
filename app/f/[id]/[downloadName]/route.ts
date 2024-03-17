import {NextApiRequest, NextApiResponse} from "next";
import prisma from "@/lib/prisma";
import * as fs from "fs";
import path from "node:path";
import {ReadableStream} from "node:stream/web";
import {NextResponse} from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextApiRequest, { params }: { params: { id: string, downloadName: string } }) {
  const url = new URL(req.url!, `http://${req.headers.host}`).pathname;
  const splittedUrl = url.split("/");
  params = {
    id: splittedUrl[2],
    downloadName: splittedUrl[3]
  };
  const file = await prisma.file.findUnique({
    where: {
      filename: params.id,
      downloadName: params.downloadName
    }
  });
  if (!file) {
    return new Response("File not found", { status: 404 });
  }


  const fileData = fs.readFileSync(path.join(process.env.SAVE_PATH, file.filename));

  return new NextResponse(fileData, {
    headers: {
      "Content-Disposition": `attachment; filename="${file.downloadName}"`,
      "Content-Type": file.mimeType
    }
  });
}
