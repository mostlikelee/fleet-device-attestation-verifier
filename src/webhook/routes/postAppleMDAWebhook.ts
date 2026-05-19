import logger from "../../utils/logger";
import { fromBase64 } from "pvutils";
import { config } from "../../config";
import getJamfData, { JamfData } from "../../jamf/getJamfData";

interface AppleAttestationData {
  Nonce: string;
  SerialNumber: string;
  UDID: string;
  SEPVersion: string;
  SecurityLevel: string;
  SecurityLevelLabel: string;
  OtherOIDs: OtherOID[];
}

interface OtherOID {
  oid: string;
  value: Uint8Array;
}

// add here your logic for approve device
function checkDevice(
  appleAttestationData: AppleAttestationData,
  jamfData: JamfData | undefined
): boolean {
  if (!jamfData) {
    return false;
  }
  if (appleAttestationData.SerialNumber !== jamfData.general?.serial_number) {
    return false;
  }
  if (config.allowedGroups.length > 0) {
    let found: boolean | undefined = undefined;
    config.allowedGroups.forEach((allowdGroup) => {
      found ||= jamfData.groups_accounts?.computer_group_memberships.includes(allowdGroup);
      jamfData.mobile_device_groups?.forEach((mobileDeviceGroup) => {
        found ||= mobileDeviceGroup.name === allowdGroup;
      });
    });
    if (!found) {
      return false;
    }
  }
  return true;
}

export default async (req: any, res: any) => {
  try {
    logger.debug(`req.headers - ${JSON.stringify(req.headers)}`);
    logger.debug(`req.body - ${JSON.stringify(req.body)}`);

    const authorizationHeader: string = req.headers.authorization;
    if (!authorizationHeader) {
      return unauthorizedError(res);
    }

    if (authorizationHeader.startsWith("Basic ")) {
      const authorizationValues: string[] = authorizationHeader.split(" ");
      if (authorizationValues.length === 2) {
        const basicAuth: string[] = fromBase64(authorizationValues[1]).split(":");
        if (basicAuth.length === 2) {
          const username: string = basicAuth[0];
          const password: string = basicAuth[1];
          if (config.username !== username || config.password !== password) {
            return unauthorizedError(res);
          }
        } else {
          return unauthorizedError(res);
        }
      } else {
        return unauthorizedError(res);
      }
    } else if (authorizationHeader.startsWith("Bearer ")) {
      const authorizationValues: string[] = authorizationHeader.split(" ");
      if (authorizationValues.length === 2) {
        const token: string = authorizationValues[1];
        if (config.token !== token) {
          return unauthorizedError(res);
        }
      } else {
        return unauthorizedError(res);
      }
    } else {
      return unauthorizedError(res);
    }

    const appleAttestationData: AppleAttestationData = req.body;
    const jamfData = await getJamfData(appleAttestationData.SerialNumber);

    const result: boolean = checkDevice(appleAttestationData, jamfData);
    logger.debug(`result - ${JSON.stringify(result)}`);

    res.status(200);
    res.type("application/problem+json");
    res.send(result);
    return res.end();
  } catch (error: any) {
    logger.error(JSON.stringify(error));
    console.log(error);

    const returnError = {
      type: "serverInternal",
      detail: "The server experienced an internal error",
    };
    res.status(500);
    res.type("application/problem+json");
    res.send(returnError);
    return res.end();
  }
};

function unauthorizedError(res: any) {
  const returnError = {
    type: "unauthorized",
    detail: "The client lacks sufficient authorization",
  };
  res.status(401);
  res.type("application/problem+json");
  res.send(returnError);
  return res.end();
}
