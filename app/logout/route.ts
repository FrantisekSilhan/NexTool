import {Logout} from "@/app/lib/authentication";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await Logout();

  return {
    status: 302,
    headers: {
      location: "/login"
    }
  };
}
