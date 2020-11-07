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

  // initMap("ZBjCfSaLSqD", "map1");
  initMap("LRlMopleWMf", "map2");
  // initMap("mZKtu7sY0w4", "map2", "openStreetMap");
  // initMap("voX07ulo2Bq", "map2");
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
