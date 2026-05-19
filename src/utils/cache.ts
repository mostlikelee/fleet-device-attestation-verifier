import NodeCache from "node-cache";
export const CACHE_KEY_GET_JAMF_TOKEN = "getJamfToken";

const myCache = new NodeCache();

export default myCache;
