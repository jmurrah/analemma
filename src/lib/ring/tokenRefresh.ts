import { promisify } from "util";
import { readFile, writeFile } from "fs";
import { RingApi } from "ring-client-api";

export async function subscribeToRingToken(ringApi: RingApi) {
  ringApi.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
      if (!oldRefreshToken) {
        return;
      }

      const currentConfig = await promisify(readFile)(".env");
      const updatedConfig = currentConfig
        .toString()
        .replace(oldRefreshToken, newRefreshToken);

      await promisify(writeFile)(".env", updatedConfig);
    },
  );
}
