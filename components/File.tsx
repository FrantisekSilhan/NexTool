'use server'

import prisma from "@/lib/prisma";
import Link from "next/link";
import {FormatFileSize} from "@/lib/file";

export default async function File({file}: { file: {filename: string, displayName: string, fileSize: number, mimeType: string, md5: string}}) {
  return (
    <li className="list__item flex-wrapper flex-wrapper--no-gap">
      <p><Link className="link" target="_blank" href={`/f/${file.filename}`}>{file.displayName}</Link> {FormatFileSize(file.fileSize)} {file.mimeType} {file.md5}</p>
    </li>
  )
}
