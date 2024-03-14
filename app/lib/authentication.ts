'use server'

import crypto from "crypto";
import prisma from "@/lib/prisma";
import {redirect} from "next/navigation";
import {CreateSession} from "@/app/lib/session";
import {cookies} from "next/headers";

export async function authenticate(_currentState: unknown, formData: FormData): Promise<string> {
  console.log("Authenticating user...");
  console.log("Form data:", formData);

  const username = formData.get('username');
  const password = formData.get('password');

  if (!username || typeof username !== "string") {
    return "Username is required";
  }
  if (!password || typeof password !== "string") {
    return "Password is required";
  }

  const user = await prisma.user.findUnique({
    where: {
      userName: username
    }
  });
  if (!user) {
    return "User not found";
  }

  const passwordHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");

  if (passwordHash !== user.password) {
    return "Password is incorrect";
  }

  cookies().set({
    name: "session_id",
    value: await CreateSession(user.id),
    maxAge: 60*60*24*30,
    path: "/",
    secure: true,
    httpOnly: true,
  });

  return redirect("/")
}

export async function register(_currentState: unknown, formData: FormData): Promise<string> {
  console.log("Registering user...");
  console.log("Form data:", formData);

  let username = formData.get('username');
  const password = formData.get('password');
  const invite = formData.get('invite');

  if (!username || typeof username !== "string") {
    return "Username is required";
  }
  if (!password || typeof password !== "string") {
    return "Password is required";
  }
  if (!invite || typeof invite !== "string") {
    return "Invite is required";
  }

  username = username.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      userName: username
    }
  });
  if (user) {
    return "User already exists";
  }

  const inviteCode = await prisma.invite.findUnique({
    where: {
      invite: invite,
      usedBy: null
    }
  });
  if (!inviteCode) {
    return "Invalid invite code";
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  const createdUser = await prisma.user.create({
    data: {
      userName: username,
      password: passwordHash,
      salt: salt
    }
  });

  await prisma.invite.update({
    where: {
      invite: invite
    },
    data: {
      usedBy: {
        set: createdUser.id
      }
    }
  });

  return redirect("/login");
}

export async function isAuthenticated() {
  console.log("Checking if user is authenticated...");

  const sessionId = cookies().get("session_id")?.value;

  if (!sessionId) {
    console.log("User is not authenticated");
    return false;
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
    }
  });
  if (!session) {
    console.log("User is not authenticated");
    return false;
  }

  if (session.expires < new Date()) {
    console.log("Session has expired");
    prisma.session.delete({
      where: {
        id: sessionId
      }
    });
    return false;
  }

  console.log("User is authenticated");
  return true;
}
