import { createInterface } from "readline";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter admin password to hash: ", async (password) => {
  rl.close();
  if (!password) {
    console.error("No password provided.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  console.log("\nYour bcrypt hash (copy this):\n");
  console.log(hash);
  console.log("\nPaste it as ADMIN_PASSWORD_HASH in .env.local");
});