import { filterData } from "./util/filters";
import { polygonsToPoints } from "./util/geojson";
import { cssColor } from "./util/colors";

import {
  RENDERING_STRATEGY_SINGLE,
  RENDERING_STRATEGY_TIMELINE,
  THEMATIC_CHOROPLETH,
  THEMATIC_BUBBLE,
  LABEL_FONT_SIZE,
  LABEL_FONT_STYLE,
  LABEL_FONT_WEIGHT,
  LABEL_FONT_COLOR,
} from "./constants/layers";

import { mapRequest } from "./util/requests";
import { addOrgUnitPaths } from "./util/helpers";
import { loadLayer } from "./util/layers";
import { defaultBasemaps } from "./constants/baseMaps";

export const loadMap = (mapId, map, baseMapId = "osmLight") =>
  mapRequest(mapId).then((config) => {
    const paths = addOrgUnitPaths(config.mapViews);

    const baseMap = defaultBasemaps().find((b) => (b.id = baseMapId));

    if (baseMap) {
      const baseMapLayer = createBaseMapLayer(baseMap.config, map);
      map.addLayer(baseMapLayer);
    }

    paths.forEach((pathConfig) => {
      loadLayer(pathConfig).then((layerConfig) => {
        const {
          id,
          index,
          opacity,
          isVisible,
          data,
          dataFilters,
          labels,
          labelFontSize,
          labelFontStyle,
          labelFontWeight,
          labelFontColor,
          valuesByPeriod,
          renderingStrategy = RENDERING_STRATEGY_SINGLE,
          thematicMapType = THEMATIC_CHOROPLETH,
          noDataColor,
        } = layerConfig;

        const bubbleMap = thematicMapType === THEMATIC_BUBBLE;

        let periodData = bubbleMap ? polygonsToPoints(data) : data;

        const filteredData = filterData(periodData, dataFilters);

        const config = {
          type: "choropleth",
          id,
          index,
          opacity,
          isVisible,
          data: filteredData,
          hoverLabel: "{name} ({value})",
          color: noDataColor,
        };

        if (labels) {
          const fontSize = labelFontSize || LABEL_FONT_SIZE;

          config.label = "{name}";
          config.labelStyle = {
            fontSize,
            fontStyle: labelFontStyle || LABEL_FONT_STYLE,
            fontWeight: labelFontWeight || LABEL_FONT_WEIGHT,
            color: cssColor(labelFontColor) || LABEL_FONT_COLOR,
            lineHeight: parseInt(fontSize, 10) * 1.2 + "px",
          };
        }

        const layer = map.createLayer(config);

        map.addLayer(layer);
      });
    });
  });

const createBaseMapLayer = (basemapConfig, map) => {
  return map.createLayer(basemapConfig);
};
