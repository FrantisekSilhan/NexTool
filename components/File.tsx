'use server'

import prisma from "@/lib/prisma";
import Link from "next/link";
import {FormatFileSize} from "@/lib/file";

export default async function File({file}: {
  file: {
    Id: number,
    Filename: string,
    DisplayName: string,
    DownloadName: string,
    IndexFile: boolean,
    FileSize: number,
    MD5: string,
    MimeType: string,
    Language: string | null,
    AddedAt: Date,
    UpdatedAt: Date
  }
}) {
  return (
    <li className="list__item flex-wrapper flex-wrapper--no-gap">
      <p><Link className="link" target="_blank"
               href={`/f/${file.Filename}`}>{file.DisplayName}</Link> {FormatFileSize(file.FileSize)} {file.MimeType} {file.MD5}
      </p></li>
  )
}
