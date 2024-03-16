'use server'

import {checkAuthentication} from "@/lib/authentication";
import UploadForm from "@/components/upload/UploadForm";

export default async function Upload() {
  await checkAuthentication();

  return (
    <>
      <h1 className={"title"}>Upload</h1>
      <UploadForm />
    </>
  )
}
