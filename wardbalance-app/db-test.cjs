const { PrismaClient } = require("./src/generated/prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const user = await prisma.user.findUnique({
      where: { email: "demo@wardbalance.local" },
      include: { school: { select: { name: true, status: true } } },
    });
    console.log("found user:", !!user);
    if (user) {
      const ok = await bcrypt.compare("Demo@123456", user.passwordHash);
      console.log("bcrypt compare Demo@123456:", ok);
    }
  } catch (e) {
    console.error("ERROR:", e.message);
    console.error("META:", JSON.stringify(e.meta || {}));
  } finally {
    await prisma.$disconnect();
  }
})();
