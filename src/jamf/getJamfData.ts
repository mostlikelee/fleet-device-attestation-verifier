import logger from "../utils/logger";
import getJamfToken, { JamfToken } from "./getJamfToken";
import { config } from "../config";
import axios from "axios";

export interface JamfData {
  general?: {
    udid: string; // hardware UDID - https://jedda.me/managed-device-attestation-a-technical-exploration/#device-udids
    name: string;
    serial_number: string;
  };
  location?: {
    username: string;
    realname: string;
    email_address: string;
    position: string;
    department: string;
  };
  groups_accounts?: {
    computer_group_memberships: string[];
  };
  mobile_device_groups?: {
    id: number;
    name: string;
  }[];
}

export default async (serialNumber: string) => {
  const jamfToken = await getJamfToken();
  if (!jamfToken) {
    logger.debug(`Cannot get Jamf token`);
    return undefined;
  }

  let mobileDevices = false;
  let results = await callJamf(
    `${config.jamfUrl}/JSSResource/computers/serialnumber/${serialNumber}`,
    jamfToken
  );
  if (!results) {
    results = await callJamf(
      `${config.jamfUrl}/JSSResource/mobiledevices/serialnumber/${serialNumber}`,
      jamfToken
    );
    mobileDevices = true;
  }

  if (results) {
    const result = results.data;
    logger.silly(`Jamf data: ${JSON.stringify(result)}`);
    const jamfData: JamfData = {};

    let data: any;
    if (mobileDevices) {
      data = result.mobile_device;
      jamfData.mobile_device_groups = result.mobile_device.mobile_device_groups;
    } else {
      data = result.computer;
      jamfData.groups_accounts = {
        computer_group_memberships: result.computer.groups_accounts.computer_group_memberships,
      };
    }

    jamfData.general = {
      udid: data.general.udid,
      name: data.general.name,
      serial_number: data.general.serial_number,
    };
    jamfData.location = {
      username: data.location.username,
      realname: data.location.realname,
      email_address: data.location.email_address,
      position: data.location.position,
      department: data.location.department,
    };

    logger.debug(`Jamf data: ${JSON.stringify(jamfData)}`);
    return jamfData;
  }
  return undefined;
};

async function callJamf(url: string, token: JamfToken) {
  const config: axios.AxiosRequestConfig = {
    headers: {
      accept: "application/json",
      Authorization: `${token.token_type} ${token.access_token}`,
    },
  };

  const result = await axios.get(url, config).catch(function (response) {
    if (response.status !== 404) {
      logger.error(`Error from Jamf: ${response}`);
    }
  });
  if (result) {
    logger.silly(`Jamf response ${JSON.stringify(result.data)}`);
  }
  return result;
}
