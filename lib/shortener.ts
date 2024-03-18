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
  if (url.length > process.env.SHORTENER_MAXIMUM_URL_LENGTH) {
    return "URL is too long";
  }
  if (useCustomUrl && !customUrl) {
    return "Custom URL is required";
  }
  if (useVisits && !visits) {
    return "Visits is required";
  }

  const key = useCustomUrl && customUrl.length <= process.env.SHORTENER_MAXIMUM_CUSTOM_LENGTH ? customUrl : await RandomString(process.env.SHORTENER_KEY_LENGTH);

  const urlRow = await prisma.url.create({
    data: {
      Key: key,
      Url: url,
      OwnerId: user.Id
    }
  }).catch(e => {
    console.log(e);
    return "Error creating URL";
  });
  if (typeof urlRow === "string") {
    return "Error creating URL";
  }
  await prisma.urlStats.create({
    data: {
      Id: urlRow.Id,
      VisitCount: 0,
      MaxVisits: useVisits ? parseInt(visits) : 0,
    }
  }).catch(e => {
    console.log(e);
    return "Error creating URL";
  });

  return `URL shortened to ${process.env.NEXT_PUBLIC_BASE_URL}/${key}`;
}
