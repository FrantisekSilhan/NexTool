'use server'

import {checkAuthentication} from "@/lib/authentication";
import prisma from "@/lib/prisma";
import File from "@/components/File";

export default async function Home() {
  await checkAuthentication();

  const files = await prisma.file.findMany({
    where: {
      IndexFile: true,
    }
  });

  return (
    <>
      <h1 className="title">Files</h1>
      <ul>
        {files.map(file => (
          <File file={file} key={file.Id} />
        ))}
      </ul>
    </>
  );
}
