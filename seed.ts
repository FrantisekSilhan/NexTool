import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.invite.create({
  data: {
    id: 0,
    createdBy: 0,
    invite: "00000000000-0000000000--00000000",
  }
})
