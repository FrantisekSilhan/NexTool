'use server'

import {checkAuthentication} from "@/lib/authentication";
import ShortenerForm from "@/components/shortener/ShortenerForm";

export default async function Shortener() {
  await checkAuthentication();

  return (
    <>
      <h1 className={"title"}>URL Shortener</h1>
      <ShortenerForm />
    </>
  )
}
