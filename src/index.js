import { init } from "d2";

import { mapRequest } from "./util/requests";

import "./styles.css";

const mapPlugin = global["mapPlugin"];

const credentials = {
  baseUrl: "https://play.dhis2.org/2.33.6",
  username: "admin",
  password: "district",
  auth: "admin:district",
};

init({
  baseUrl: `${credentials.baseUrl}/api/33`,
  headers: {
    Authorization: `Basic ${btoa(credentials.auth)}`,
  },
}).then((d2) => {
  mapPlugin.url = credentials.baseUrl;
  mapPlugin.loadingIndicator = true;
  mapPlugin.dashboard = true;
  if (credentials.username && credentials.password) {
    mapPlugin.username = credentials.username;
    mapPlugin.password = credentials.password;
  }
  loadMap("ZBjCfSaLSqD", "map1");
  loadMap("mZKtu7sY0w4", "map2");
  loadMap("GlCLRPPLsWF", "map3");
  loadMap("kNYqHu3e7o3", "map4");
  loadMap("HVIYhS1C4ft", "map5");
  loadMap("ZF6UZ9Sg5Ai", "map6");
});

const loadMap = (mapId, container) => {
  mapRequest(mapId).then((map) => {
    const config = {
      ...map,
      el: container,
    };
    mapPlugin.load(config);
  });
};
