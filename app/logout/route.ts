import {Logout} from "@/app/lib/authentication";
import {redirect, RedirectType} from "next/navigation";

export const dynamic = 'force-dynamic';

export async function GET(_: Request) {
  await Logout();

  redirect("/login");
}
