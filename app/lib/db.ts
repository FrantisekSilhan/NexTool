import prisma from "@/lib/prisma";

export async function init() {
  if (await prisma.invite.count() === 0) {
    await prisma.invite.create({
      data: {
        id: 0,
        createdBy: 0,
        invite: "00000000000-0000000000--00000000",
      }
    })
  }
}
