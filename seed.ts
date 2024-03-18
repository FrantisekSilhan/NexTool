import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const admin = await prisma.user.create({
  data: {
    Id: 0,
    Username: "admin",
    Password: "18eca63c99b44fa755b012e045b02376ae1963c88da8207b7b6d3f33b64d73853795bbd379a987da86ae13da19796b45512ba16d401d8a6d5e46cab890fa58de", // admin
    Salt: "26ccf925599d15f2b9606dd53bf88f73",
    Permissions: 511,
  },
});
