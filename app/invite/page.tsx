'use server'

import {checkAuthentication, isAuthenticated} from "@/app/lib/authentication";
import CreateInviteForm from "@/components/invite/CreateInviteForm";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {redirect} from "next/navigation";

export default async function Invite() {
  await checkAuthentication();

  const {user} = await isAuthenticated();
  if (!user) {
    return "Not authenticated";
  }

  const invites = await prisma.invite.findMany({
    where: {
      createdBy: user.id,
      usedBy: null
    }
  });

  return (
    <>
      <h1 className="title">Create Invite Code</h1>
      <h2 className="title title--s4">Unused Invite Codes</h2>
      <ul className="list">
        <li className="list__item" style={{display: "none"}}><p className="mono-select-all"></p></li>
        {invites.map(invite => (
          <li key={invite.id} className="list__item"><p className={"mono-select-all"}>{invite.invite}</p></li>
        ))}
        {invites.length === 0 && <li className="list__item"><p>No invite codes</p></li>}
      </ul>

      <CreateInviteForm />
    </>
  );
}

function GenerateInviteCode(userId: number) {
  const genCode = () => crypto.randomBytes(8).toString("base64url");
  return `${genCode()}-${genCode()}--${String(userId).padStart(8, "0")}`;
}

export async function CreateInvite() {
  console.log("Creating invite")

  const {authenticated, user} = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  if (!user) {
    return "Not authenticated";
  }

  await prisma.invite.create({
    data: {
      invite: GenerateInviteCode(user.id),
      createdBy: user.id
    }
  });

  return "";
}
