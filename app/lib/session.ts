'use server'

import crypto from "crypto";
import prisma from "@/lib/prisma";
import {cookies} from "next/headers";

export async function CreateSession(user: number) {
  console.log("Creating session for user", user);

  const oldSession = await prisma.session.findFirst({
    where: {
      userId: user
    }
  });

  if (oldSession) {
    console.log("Deleting old session", oldSession);
    await prisma.session.delete({
      where: {
        id: oldSession.id
      }
    })
  }

  const id = crypto.randomBytes(32).toString("hex");

  console.log("Creating new session", id);

  await prisma.session.create({
    data: {
      id: id,
      userId: user,
      expires: new Date(Date.now() + 1000*60*60*24*30)
    }
  });

  return id;
}

export async function CheckSession(session: string, userId: number) {
  console.log("Checking session", session, userId);

  const s = await prisma.session.findFirst({
    where: {
      id: session,
      userId: userId,
      expires: {
        gt: new Date()
      }
    }
  });

  if (s) {
    console.log("Session is valid");
    return true;
  } else {
    console.log("Session is invalid");
    return false;
  }
}
