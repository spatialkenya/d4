import { init, config } from "d2";
import mapApi from "./webmap/mapApi";

import { loadMap } from "./loadMap";

import "./styles.css";

init({
  baseUrl: "https://play.dhis2.org/2.35.0/api/35",
  headers: {
    Authorization: `Basic ${btoa("admin:district")}`,
  },
}).then((d2) => {
  config.schemas = [
    "dataElement",
    "dataElementGroup",
    "dataSet",
    "externalMapLayer",
    "indicator",
    "indicatorGroup",
    "legendSet",
    "map",
    "optionSet",
    "organisationUnit",
    "organisationUnitGroup",
    "organisationUnitGroupSet",
    "organisationUnitLevel",
    "program",
    "programStage",
    "userGroup",
  ];

  initMap("ZBjCfSaLSqD", "map1"); // thematic
  initMap("mZKtu7sY0w4", "map2"); // events
  initMap("GlCLRPPLsWF", "map3"); // thematic + boundary
  initMap("kNYqHu3e7o3", "map4"); //
  initMap("HVIYhS1C4ft", "map5"); // thematic + earthEngine
  initMap("ZF6UZ9Sg5Ai", "map6"); // facilities
});

const initMap = (mapId, containerId, baseMapId) => {
  const mapContainerWrapper = document.getElementById(containerId);

  if (mapContainerWrapper) {
    const map = mapApi({});

    mapContainerWrapper.appendChild(map.getContainer());

    map.on("ready", function () {
      map.resize();
      loadMap(mapId, map, baseMapId);
    });
  }
};
