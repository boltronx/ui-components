import type { NextConfig } from "next";

const config: NextConfig = {
  // The fixture is checked by building it; a type or lint error should fail that build.
  typescript: { ignoreBuildErrors: false },
  // `next dev` otherwise writes an AGENTS.md into the app.
  agentRules: false
};

export default config;
