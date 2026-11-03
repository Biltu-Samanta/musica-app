import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hervoice.app",
  appName: "Her Voice",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
