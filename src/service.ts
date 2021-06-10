import axios from "axios";
import { CommunityUrlResult } from "./api/types";
import config from "./config";
import logger from "./utils/logger";

const API_BASE_URL = config.hubUrl;
const PLATFORM = "discord";

function userJoined(refId: string, idFromPlatform: string, sender: string) {
  axios
    .post(`${API_BASE_URL}/user/joined`, {
      refId,
      idFromPlatform,
      platform: PLATFORM,
      sender,
    })
    .then((res) => {
      logger.debug(JSON.stringify(res.data));
    })
    .catch(logger.error);
}

function userRemoved(idFromPlatform: string, sender: string) {
  axios
    .post(`${API_BASE_URL}/user/removed`, {
      idFromPlatform,
      platform: PLATFORM,
      sender,
    })
    .then((res) => {
      logger.debug(JSON.stringify(res.data));
    })
    .catch(logger.error);
}

async function getCommunityUrls(
  idFromPlatform: string
): Promise<CommunityUrlResult[]> {
  const result = await axios.get(
    `${API_BASE_URL}/community/url/${idFromPlatform}`
  );
  return result.data;
}

export { userJoined, userRemoved, getCommunityUrls };
