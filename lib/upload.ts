'use server'

import path from "node:path";
import * as fs from "fs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import {checkAuthentication, isAuthenticated} from "@/lib/authentication";
import {fileTypeFromBlob, fileTypeFromBuffer} from "file-type";
import sharp from "sharp";
import {run} from "ffmpeg-helper";
import ffmpeg from "fluent-ffmpeg";

export default async function UploadFile(_currentState: unknown, formData: FormData): Promise<string> {
  const {authenticated, user} = await isAuthenticated();
  if (!authenticated || !user) {
    return "User is not authenticated";
  }

  console.log("Uploading file...");

  // TODO: Check if user is authenticated and has permissions

  const file = formData.get('file');
  let downloadName = formData.get('downloadName');
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

  fs.mkdirSync(path.join(process.env.SAVE_PATH), {recursive: true});

  const savePath = path.join(process.env.SAVE_PATH, fileName);

  console.log("Saving file to", savePath);

  const type = await fileTypeFromBuffer(fileBuffer);
  let mimeType = type ? type.mime.toString() : "application/octet-stream";

  if (mimeType.startsWith("image/")) {
    const image = sharp(fileBuffer);
    if (convertToGif) {
      console.log("Converting image to GIF");
      await image.resize(560, 560, {fit: "inside"}).gif().toFile(savePath);
      downloadName = downloadName.replace(/\.[^/.]+$/, ".gif");
    } else {
      console.log("Converting to WebP");
      await image.webp({quality: 75}).toFile(savePath);
    }
  } else if (mimeType.startsWith("video/") && convertToGif) {
    console.log("Converting video to GIF");
    await fs.promises.writeFile(savePath + ".orig", fileBuffer).catch((err) => {
      console.error("Error saving original file", err);
      throw "Error saving original file";
    });

    let isWidthLonger = false;
    await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(savePath + ".orig", (err, metadata) => {
        if (err || !metadata) {
          reject(err);
        }
        isWidthLonger = (metadata.streams[0].width ?? 0) > (metadata.streams[0].height ?? 0);
        resolve(null);
      });
    }).catch((err) => {
      console.error("Error getting metadata", err);
      throw err;
    });

    console.log("Creating GIF");

    await new Promise(async (resolve, reject) => {
      await run(`-i ${savePath}.orig -vf "scale=${isWidthLonger ? "560:-1" : "-1:560"}:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" -f gif ${savePath}`)
        .catch((err) => {
          console.error("Error creating GIF", err);
          reject(err);
        });
      resolve(null);
    }).catch((err) => {
      console.error("Error creating GIF", err);
      throw "Error creating GIF";
    });

    await fs.promises.unlink(savePath + ".orig").catch((err) => {
      console.error("Error deleting original file", err);
    });

    downloadName = downloadName.replace(/\.[^/.]+$/, ".gif");
  } else {
    console.log("Saving file")
    await fs.promises.writeFile(savePath, fileBuffer).catch((err) => {
      console.error("Error saving file", err);
      throw "Error saving file";
    });
  }

  console.log("File saved");

  const fileStat = fs.statSync(savePath);
  const newFileBuffer = fs.readFileSync(savePath);

  let md5 = crypto.createHash("md5").update(newFileBuffer).digest("hex");
  const newType = await fileTypeFromBuffer(newFileBuffer);
  mimeType = newType ? newType.mime.toString() : "application/octet-stream";

  console.log("Creating file record");

  await prisma.file.create({
    data: {
      filename: fileName,
      downloadName: downloadName,
      displayName: displayName,
      indexFile: includeInIndex,
      fileSize: fileStat.size,
      md5: md5,
      mimeType: mimeType,
      language: language ? language.toString() : null,
      owner: user.id
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
