'use server'

import path from "node:path";
import * as fs from "fs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import {checkAuthentication} from "@/lib/authentication";
import {fileTypeFromBlob, fileTypeFromBuffer} from "file-type";

export default async function UploadFile(_currentState: unknown, formData: FormData): Promise<string> {
  console.log("Uploading file...");

  // TODO: Check if user is authenticated and has permissions

  const file = formData.get('file');
  const downloadName = formData.get('downloadName');
  const displayName = formData.get('displayName');
  const language = formData.get('languageSelect');
  const convertToGif = formData.get('gif') === "on";
  const includeInIndex = formData.get('index') === "on";
  if (!file || !(file instanceof Blob)) {
    return "File is required";
  }
  if (file.size > process.env.NEXT_PUBLIC_MAXIMUM_FILE_SIZE) {
    return "File is too large";
  }
  if (!downloadName || typeof downloadName !== "string") {
    return "Download name is required";
  }
  if (downloadName.length > process.env.NEXT_PUBLIC_MAXIMUM_DOWNLOAD_NAME_LENGTH) {
    return "Download name is too long";
  }
  if (!displayName || typeof displayName !== "string") {
    return "Display name is required";
  }
  if (displayName.length > process.env.NEXT_PUBLIC_MAXIMUM_DISPLAY_NAME_LENGTH) {
    return "Display name is too long";
  }

  const fileName = await GenerateFileName();

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  fs.mkdirSync(path.dirname(process.env.SAVE_PATH), {recursive: true});

  const savePath = path.join(process.env.SAVE_PATH, fileName);

  console.log("Saving file to", savePath);

  fs.writeFile(savePath, fileBuffer, (err) => {
    if (err) {
      console.error("Error writing file", err);
      return "Error writing file";
    }
  });

  const md5 = crypto.createHash("md5").update(fileBuffer).digest("hex");
  const type = await fileTypeFromBuffer(fileBuffer);

  await prisma.file.create({
    data: {
      filename: fileName,
      downloadName: downloadName,
      displayName: displayName,
      indexFile: includeInIndex,
      fileSize: file.size,
      md5: md5,
      mimeType: type ? type.mime.toString() : "application/octet-stream",
      language: language ? language.toString() : null,
    }
  });

  return "File uploaded";
}

function RandomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function GenerateFileName() {
  while (true) {
    const name = RandomString(process.env.FILE_NAME_LENGTH);
    const exists = await prisma.file.findFirst({
      where: {
        filename: name
      }
    });
    if (!exists) {
      return name;
    }
  }
}
