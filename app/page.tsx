'use server'

import {checkAuthentication} from "@/app/lib/authentication";

export default async function Home() {
  await checkAuthentication();

  return (
    <>
      <p>asfkhasf</p>
    </>
  );
}
