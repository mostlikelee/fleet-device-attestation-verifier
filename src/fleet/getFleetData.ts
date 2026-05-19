import axios from "axios";
import { config } from "../config";
import logger from "../utils/logger";

export interface FleetLabel {
  id: number;
  name: string;
}

export interface FleetHost {
  id: number;
  hardware_serial: string;
  uuid: string;
  hostname: string;
  team_id: number | null;
  team_name: string | null;
  labels: FleetLabel[];
  platform: string;
}

export default async (serialNumber: string): Promise<FleetHost | undefined> => {
  if (!config.fleetUrl || !config.fleetToken) {
    logger.debug(`try to query Fleet without filled data!`);
    return undefined;
  }

  const url = `${config.fleetUrl}/api/v1/fleet/hosts/identifier/${encodeURIComponent(
    serialNumber
  )}?exclude_software=true&exclude_fleet_maintained_policies=true`;

  const requestConfig: axios.AxiosRequestConfig = {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${config.fleetToken}`,
    },
    validateStatus: () => true,
  };

  const response = await axios.get(url, requestConfig).catch(function (error) {
    logger.error(`Network error calling Fleet: ${error?.message ?? error}`);
    return undefined;
  });

  if (!response) {
    return undefined;
  }

  if (response.status === 404) {
    logger.debug(`Fleet has no host with serial ${serialNumber}`);
    return undefined;
  }

  if (response.status === 401) {
    throw new Error(
      `Fleet returned 401 — FLEET_TOKEN is invalid or revoked; rotate the API-only user token`
    );
  }

  if (response.status < 200 || response.status >= 300) {
    logger.error(
      `Unexpected status ${response.status} from Fleet: ${JSON.stringify(response.data)}`
    );
    return undefined;
  }

  const host: FleetHost | undefined = response.data?.host;
  if (!host) {
    logger.error(`Fleet response missing host field: ${JSON.stringify(response.data)}`);
    return undefined;
  }

  logger.silly(`Fleet response ${JSON.stringify(host)}`);
  logger.debug(
    `Fleet host: id=${host.id} serial=${host.hardware_serial} uuid=${host.uuid} labels=${host.labels?.length ?? 0}`
  );
  return host;
};
