'use server'

import crypto from "crypto";
import prisma from "@/lib/prisma";
import {redirect} from "next/navigation";

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

  return "";
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

  return redirect("/dashboard");
}
