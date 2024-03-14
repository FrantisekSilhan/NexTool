'use server'

import NavBarLink from "@/components/navbar/NavBarLink";
import {isAuthenticated} from "@/app/lib/authentication";
import {isAdmin} from "@/app/lib/permissions";

export default async function Links() {
  const { authenticated, user } = await isAuthenticated();

  let hasAdmin = false;

  if (authenticated && user) {
    hasAdmin = await isAdmin(user.permissions);
  }

  return (
    <>
      { hasAdmin && <NavBarLink name={"Admin"} link={"/admin"}/> }
      {authenticated && <>
          <NavBarLink name={"Shortener"} link={"/shortener"}/>
          <NavBarLink name={"Upload"} link={"/upload"}/>
          <NavBarLink name={"Dashboard"} link={"/dashboard"}/>
          <NavBarLink name={"Invite"} link={"/invite"}/>
          <NavBarLink name={"Sign out"} link={"/logout"}/>
      </> || <>
          <NavBarLink name={"Sign in"} link={"/login"}/>
          <NavBarLink name={"Sign up"} link={"/register"}/>
        </>
      }
      </>
  )
}
