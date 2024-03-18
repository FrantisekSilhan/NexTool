'use server'

import prisma from "@/lib/prisma";
import Link from "next/link";
import FilePreview from "@/components/file/FilePreview";

export default async function ShowFile({params}: {params: {id: string}}) {
  const file = await prisma.file.findUnique({
    where: {
      Filename: params.id
    }
  });
  if (!file) {
    return {status: 404};
  }

  return (
    <div className={"file-wrapper"}>
      <div className={"file-title"}>
        <Link className={"icon"} href={`/f/${file.Filename}/${file.DownloadName}`}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512">
            <path d="M368 224l-128 128-128-128h80v-192h96v192zM240 352h-240v128h480v-128h-240zM448 416h-64v-32h64v32z"></path>
          </svg>
        </Link>
        <h1 className={"title title--s4"}>{file.DownloadName}</h1>
      </div>

      <FilePreview src={`/f/${file.Filename}/${file.DownloadName}`} language={file.Language} mimeType={file.MimeType} />
    </div>
  )
}
