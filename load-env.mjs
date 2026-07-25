import { config } from 'dotenv';
import { resolve } from 'path';

// override: true — this project's .env.local must win over stray machine/user-level
// env vars of the same name (e.g. a global ADMIN_USERNAME set outside this project).
config({ path: resolve(process.cwd(), '.env.local'), override: true });
