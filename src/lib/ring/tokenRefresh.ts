import { promisify } from "util";
import { readFile, writeFile } from "fs";
import { resolve } from "path";
import { RingApi } from "ring-client-api";

export async function subscribeToRingToken(ringApi: RingApi) {
  ringApi.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
      if (!oldRefreshToken) {
        return;
      }

      const envPath = resolve(
        process.env.GITHUB_WORKSPACE ?? process.cwd(),
        ".env",
      );

      try {
        const currentConfig = await promisify(readFile)(envPath);
        const updatedConfig = currentConfig
          .toString()
          .replace(oldRefreshToken, newRefreshToken);

        await promisify(writeFile)(envPath, updatedConfig);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : undefined;
        if (code === "ENOENT") {
          console.warn("Skipping .env refresh token update; file not found", {
            envPath,
          });
          return;
        }
        console.error("Failed to update .env refresh token", {
          envPath,
          error,
        });
      }
    },
  );
}
