import { mapRequest } from "./util/requests";
import { addOrgUnitPaths } from "./util/helpers";
import { loadLayer } from "./util/layers";
import { defaultBasemaps } from "./constants/baseMaps";
import { controlTypes } from "./webmap/MapApi";
import { pluginControls } from "./constants/mapControls";

export const loadMap = (mapId, map, baseMapId = "osmLight") =>
  mapRequest(mapId).then((config) => {
    const paths = addOrgUnitPaths(config.mapViews);

    const baseMap = defaultBasemaps().find((b) => b.id === baseMapId);

    if (baseMap) {
      const baseMapLayer = createBaseMapLayer(baseMap.config, map);
      map.addLayer(baseMapLayer);
    }

    // map controls
    [{ type: "zoom" }]
      .filter((control) => controlTypes.includes(control.type))
      .forEach((control) => map.addControl(control));

    paths.forEach((pathConfig) => {
      loadLayer(pathConfig).then((layerConfig) => {
        const layer = map.createLayer(layerConfig);
        if (layer.getBounds) {
          map.fitBounds(layer.getBounds());
        }

        // fit bounds
        map.addLayer(layer);
      });
    });
  });

const createBaseMapLayer = (basemapConfig, map) => {
  return map.createLayer(basemapConfig);
};
