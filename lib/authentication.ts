'use server'

import crypto from "crypto";
import prisma from "@/lib/prisma";
import {redirect} from "next/navigation";
import {CreateSession} from "@/lib/session";
import {cookies} from "next/headers";
import {User} from "@prisma/client";
import {sendStatusCode} from "next/dist/server/api-utils";

export async function authenticate(_currentState: unknown, formData: FormData): Promise<string> {
  console.log("Authenticating user...");

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
      Username: username
    }
  });
  if (!user) {
    return "User not found";
  }

  const passwordHash = crypto.pbkdf2Sync(password, user.Salt, 1000, 64, "sha512").toString("hex");

  if (passwordHash !== user.Password) {
    return "Password is incorrect";
  }

  cookies().set({
    name: "session_id",
    value: await CreateSession(user.Id),
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
      Username: username
    }
  });
  if (user) {
    return "User already exists";
  }

  const inviteCode = await prisma.invite.findUnique({
    where: {
      Invite: invite,
      UsedBy: null
    }
  });
  if (!inviteCode) {
    return "Invalid invite code";
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  const createdUser = await prisma.user.create({
    data: {
      Username: username,
      Password: passwordHash,
      Salt: salt
    }
  });

  await prisma.invite.update({
    where: {
      Invite: invite
    },
    data: {
      UsedBy: {
        set: createdUser.Id
      }
    }
  });

  return redirect("/login");
}

export async function Logout() {
  console.log("Logging out user...");

  const sessionId = cookies().get("session_id")?.value;

  if (!sessionId) {
    console.log("User is not authenticated");
    return redirect("/login");
  }

  await prisma.session.delete({
    where: {
      Id: sessionId
    }
  });

  cookies().delete("session_id");

  return redirect("/login");
}

type Authenticated = {
  authenticated: boolean;
  user: User | null;
}

export async function isAuthenticated(): Promise<Authenticated> {
  console.log("Checking if user is authenticated...");

  const sessionId = cookies().get("session_id")?.value;

  if (!sessionId) {
    console.log("User is not authenticated");
    return {
      authenticated: false,
      user: null
    };
  }

  const session = await prisma.session.findFirst({
    where: {
      Id: sessionId,
    }
  });
  if (!session) {
    console.log("User is not authenticated");
    return {
      authenticated: false,
      user: null
    };
  }

  if (session.Expires < new Date()) {
    console.log("Session has expired");
    await prisma.session.delete({
      where: {
        Id: sessionId
      }
    });
    return {
      authenticated: false,
      user: null
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      Id: session.UserId
    }
  });

  console.log("User is authenticated");
  return {
    authenticated: true,
    user: user
  };
}

export async function checkAuthentication() {
  const { authenticated } = await isAuthenticated();
  if (!authenticated) {
    return redirect("/login");
  }
}
