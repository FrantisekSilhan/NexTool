'use server'

import {RandomString} from "@/lib/upload";
import prisma from "@/lib/prisma";
import {isAuthenticated} from "@/lib/authentication";

export default async function Shorten(_currentState: unknown, formData: FormData) {
  const {authenticated, user} = await isAuthenticated();
  if (!authenticated || !user) {
    return "User is not authenticated";
  }

  const url = formData.get("url") as string;
  const customUrl = formData.get("customUrl") as string;
  const useCustomUrl = formData.get("useCustomUrl") === "on";
  const visits = formData.get("visits") as string;
  const useVisits = formData.get("useVisits") === "on";
  if (!url) {
    return "URL is required";
  }
  if (useCustomUrl && !customUrl) {
    return "Custom URL is required";
  }
  if (useVisits && !visits) {
    return "Visits is required";
  }

  const key = useCustomUrl ? customUrl : await RandomString(process.env.SHORTENER_KEY_LENGTH);

  const urlRow = await prisma.url.create({
    data: {
      key: key,
      url: url,
    }
  });
  await prisma.urlStats.create({
    data: {
      id: urlRow.id,
      visitCount: 0,
      maxVisits: useVisits ? parseInt(visits) : 0,
      owner: user.id
    }
  })
}
