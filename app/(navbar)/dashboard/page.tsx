'use server'

import {checkAuthentication, isAuthenticated} from "@/lib/authentication";
import Link from "next/link";
import prisma from "@/lib/prisma";
import File from "@/components/File";

export default async function Dashboard() {
  await checkAuthentication();

  const {user} = await isAuthenticated();
  if (!user) {
    return "Not authenticated";
  }

  const files = await prisma.file.findMany({
    where: {
      OwnerId: user.Id,
    }
  });

  const invites = await prisma.invite.findMany({
    where: {
      CreatorId: user.Id,
    }
  });

  return (
    <>
      <h1 className="title">Dashboard</h1>
      <div className="section">
        <h2 className="title title--s4">Account</h2>
        <p className="text">Username: {user.Username} (uid: {user.Id}) <Link className="link" href={"/logout"}>Sign
          out</Link></p>
      </div>

      <div className="section">
        <h2 className="title title--s4">Files</h2>
        <ul className="list">
          {files.map(file => (
            <File file={file} key={file.Id} />
          ))}
          <li className="scroll"></li>
        </ul>
      </div>

      <div className="section">
        <h2 className="title title--s4">Shortened URLs</h2>
        <ul className="list">
          {/*<li className="list__item flex-wrapper flex-wrapper--no-gap">*/}
          {/*<p><a className="link" target="_blank" href=""></a> <span></span> Visits:  MaxVisits: </p>*/}
          {/*</li>*/}
          <li className="scroll"></li>
        </ul>
      </div>

      <div className="section">
        <h2 className="title title--s4">Invite Codes</h2>
        <ul className="list">
          <li className="list__item flex-wrapper flex-wrapper--no-gap" style={{display: "none"}}><p
            className="mono-select-all"></p></li>
          {/*TODO: Add reactivity for removing invite codes*/}
          {invites.map(invite => (
            <li key={invite.Id} className="list__item flex-wrapper flex-wrapper--no-gap">
              <p><span className={"mono-select-all"}>{invite.Invite}</span> (uid: {invite.UsedBy ?? "Null"})</p>
            </li>
          ))}
          {invites.length === 0 && <li className="list__item"><p>No invite codes</p></li>}
        </ul>
      </div>
    </>
  )
}
