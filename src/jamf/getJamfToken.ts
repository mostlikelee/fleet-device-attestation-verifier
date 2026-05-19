import logger from "../utils/logger";
import cache, { CACHE_KEY_GET_JAMF_TOKEN } from "../utils/cache";
import { config } from "../config";
import axios from "axios";

export interface JamfToken {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

export default async () => {
  if (!config.jamfUrl || !config.jamfClientId || !config.jamfClientSecret) {
    logger.debug(`try to get token from Jamf without filled data!`);
    return undefined;
  }

  const cacheKey = `${CACHE_KEY_GET_JAMF_TOKEN}_${config.jamfClientId}`;
  // Check Cache by Function name and User ID
  const cachedResults: JamfToken | undefined = cache.get(cacheKey);
  if (cachedResults) {
    logger.debug(`cache hit: ${cacheKey}`);
    return cachedResults;
  }

  const data = new FormData();
  data.append("grant_type", "client_credentials");
  data.append("client_id", config.jamfClientId);
  data.append("client_secret", config.jamfClientSecret);

  const results = await axios.postForm(`${config.jamfUrl}/api/oauth/token`, data);
  if (results) {
    const jamfToken: JamfToken = results.data;
    logger.debug(`token result ${JSON.stringify(jamfToken)}`);

    // Set Cache
    cache.set(cacheKey, jamfToken, jamfToken.expires_in);
    return jamfToken;
  }
  return undefined;
};
