'use server'

import crypto from "crypto";

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
