import i18n from "@dhis2/d2-i18n";
import { getInstance as getD2 } from "d2";
import { getEventColumns } from "../util/requests";
import { styleByDataItem } from "../util/styleByDataItem";
import {
  getOrgUnitsFromRows,
  getFiltersFromColumns,
  getFiltersAsText,
  getPeriodFromFilters,
  getPeriodNameFromId,
} from "../util/analytics";
import {
  createEventFeatures,
  addStyleDataItem,
  getBounds,
} from "../util/geojson";
import { getEventStatuses } from "../constants/eventStatuses";
import { EVENT_COLOR, EVENT_RADIUS } from "../constants/layers";
import { createAlert } from "../util/alerts";
import { formatLocaleDate } from "../util/time";
import { cssColor } from "../util/colors";
import { filterData } from "../util/filters";
import { formatCount } from "../util/numbers";

// Server clustering if more than 2000 events
const useServerCluster = (count) => count > 2000; // TODO: Use constant

const accessDeniedAlert = createAlert(
  i18n.t("Access denied"),
  i18n.t("user is not allowed to read layer data")
);
const unknownErrorAlert = createAlert(
  i18n.t("Failed"),
  i18n.t("an unknown error occurred while reading layer data")
);

// TODO: Refactor to share code with other loaders
// Returns a promise
const eventLoader = async (layerConfig) => {
  let config = { ...layerConfig };
  try {
    await loadEventLayer(config);
  } catch (e) {
    if (e.httpStatusCode === 403 || e.httpStatusCode === 409) {
      config.alerts = [accessDeniedAlert];
    } else {
      config.alerts = [unknownErrorAlert];
    }
  }

  config.isLoaded = true;
  config.isExpanded = true;
  config.isVisible = true;

  return createLayerConfig(config);
};

const createLayerConfig = (layerConfig) => {
  const {
    id,
    index,
    opacity,
    isVisible,
    bounds,
    data,
    eventClustering,
    eventPointColor,
    eventPointRadius,
    program,
    programStage,
    serverCluster,
    areaRadius,
    styleDataItem,
    legend,
    dataFilters,
  } = layerConfig;

  const filteredData = filterData(data, dataFilters);

  // Some older favorites don't have a valid color code
  const color =
    eventPointColor && eventPointColor.charAt(0) !== "#"
      ? "#" + eventPointColor
      : eventPointColor;

  let d2;
  let eventRequest;

  // Data elements to display in event popup
  let displayElements = {};

  // Default props = no cluster
  const config = {
    type: "events",
    id,
    index,
    opacity,
    isVisible,
    data: filteredData,
    fillColor: color || EVENT_COLOR,
    radius: eventPointRadius || EVENT_RADIUS,
    // onClick: this.onEventClick.bind(this),
  };

  if (eventClustering) {
    if (serverCluster) {
      config.type = "serverCluster";
      config.bounds = bounds;

      config.load = async (params, callback) => {
        d2 = d2 || (await getD2());

        eventRequest = eventRequest || (await getAnalyticsRequest(layerConfig));

        eventRequest = eventRequest
          .withBbox(params.bbox)
          .withClusterSize(params.clusterSize)
          .withIncludeClusterPoints(params.includeClusterPoints);

        const clusterData = await d2.analytics.events.getCluster(eventRequest);

        callback(params.tileId, toGeoJson(clusterData));
      };
    } else {
      config.clusterPane = id;

      if (styleDataItem && legend) {
        config.type = "donutCluster";
        config.groups = legend.items;
      } else {
        config.type = "clientCluster";
      }
    }
  } else if (areaRadius) {
    config.buffer = areaRadius;
    config.bufferStyle = {
      color: color || EVENT_COLOR,
      weight: 1,
      opacity: 0.2,
      fillOpacity: 0.1,
    };
  }

  // if (program && programStage) {
  //   this.loadDisplayElements();
  // }

  return config;
};

// Convert server cluster response to GeoJSON
const toGeoJson = (data) => {
  let clusterCount = 0;
  const header = {};
  const features = [];

  // Convert headers to object for easier lookup
  data.headers.forEach((h, i) => (header[h.name] = i));

  if (Array.isArray(data.rows)) {
    data.rows.forEach((row) => {
      const extent = row[header.extent].match(/([-\d.]+)/g);
      const count = parseInt(row[header.count], 10);
      const clusterId = ++clusterCount;

      features.push({
        type: "Feature",
        id: clusterId,
        geometry: JSON.parse(row[header.center]),
        properties: {
          cluster: count > 1,
          cluster_id: clusterId,
          point_count: count,
          point_count_abbreviated: formatCount(count),
          bounds: [
            [extent[0], extent[1]],
            [extent[2], extent[3]],
          ],
          id: row[header.points],
        },
      });
    });
  }

  return features;
};

const loadEventLayer = async (config) => {
  const {
    columns,
    endDate,
    eventStatus,
    eventClustering,
    eventPointColor,
    eventPointRadius,
    filters,
    programStage,
    startDate,
    styleDataItem,
    areaRadius,
    showDataTable,
  } = config;

  const period = getPeriodFromFilters(filters);
  const dataFilters = getFiltersFromColumns(columns);
  const d2 = await getD2();
  const spatialSupport = d2.system.systemInfo.databaseInfo.spatialSupport;

  config.isExtended = showDataTable;

  let analyticsRequest = await getAnalyticsRequest(config);
  let alert;

  config.name = programStage.name;

  config.legend = {
    title: config.name,
    period: period
      ? getPeriodNameFromId(period.id)
      : `${formatLocaleDate(startDate)} - ${formatLocaleDate(endDate)}`,
    items: [],
  };

  // Delete serverCluster option if previously set
  delete config.serverCluster;

  if (spatialSupport && eventClustering) {
    const response = await getCount(analyticsRequest);
    config.bounds = getBounds(response.extent);
    config.serverCluster = useServerCluster(response.count) && !styleDataItem;
  }

  if (!config.serverCluster) {
    config.outputIdScheme = "ID"; // Required for StyleByDataItem to work
    const { names, data, response } = await loadData(analyticsRequest, config);
    config.data = data;

    if (Array.isArray(config.data) && config.data.length) {
      let explanation = [];

      if (styleDataItem) {
        await styleByDataItem(config);
      } else {
        config.legend.items = [
          {
            name: i18n.t("Event"),
            color: cssColor(eventPointColor) || EVENT_COLOR,
            radius: eventPointRadius || EVENT_RADIUS,
          },
        ];
      }

      if (eventStatus) {
        explanation.push(
          `${i18n.t("Event status")}: ${
            getEventStatuses().find((s) => s.id === eventStatus).name
          }`
        );
      }

      if (areaRadius) {
        explanation.push(`${i18n.t("Buffer")}: ${areaRadius} ${"m"}`);
      }

      if (explanation.length) {
        config.legend.explanation = explanation;
      }
    } else {
      alert = createAlert(config.name, i18n.t("No data found"));
    }

    // TODO: Add filters to legend when using server cluster
    // Currently not done as names are not available
    config.legend.filters =
      dataFilters &&
      getFiltersAsText(dataFilters, {
        ...names,
        ...(await getFilterOptionNames(dataFilters, response.headers)),
      });

    config.headers = response.headers;
  }

  if (alert) {
    config.alerts = [alert];
  }
};

// Also used to query for server cluster in map/EventLayer.js
// TODO: Use DataIDScheme / OutputIDScheme instead of requesting all metaData (which can easily dwarf the actual response data)
export const getAnalyticsRequest = async ({
  program,
  programStage,
  filters,
  startDate,
  endDate,
  rows,
  columns,
  styleDataItem,
  eventStatus,
  eventCoordinateField,
  relativePeriodDate,
  isExtended,
}) => {
  const orgUnits = getOrgUnitsFromRows(rows);
  const period = getPeriodFromFilters(filters);
  const dataItems = addStyleDataItem(
    columns.filter(isValidDimension),
    styleDataItem
  );

  // Add "display in reports" columns that are not already present
  if (isExtended) {
    const displayColumns = await getEventColumns({ programStage });

    displayColumns.forEach((col) => {
      if (!dataItems.find((item) => item.dimension === col.dimension)) {
        dataItems.push(col);
      }
    });
  }

  const d2 = await getD2();

  let analyticsRequest = new d2.analytics.request()
    .withProgram(program.id)
    .withStage(programStage.id)
    .withCoordinatesOnly(true);

  analyticsRequest = period
    ? analyticsRequest.addPeriodFilter(period.id)
    : analyticsRequest.withStartDate(startDate).withEndDate(endDate);

  if (relativePeriodDate) {
    analyticsRequest = analyticsRequest.withRelativePeriodDate(
      relativePeriodDate
    );
  }

  analyticsRequest = analyticsRequest.addOrgUnitDimension(
    orgUnits.map((ou) => ou.id)
  );

  if (dataItems) {
    dataItems.forEach((item) => {
      analyticsRequest = analyticsRequest.addDimension(
        item.dimension,
        item.filter
      );
    });
  }

  if (eventCoordinateField) {
    // If coordinate field other than event coordinate
    analyticsRequest = analyticsRequest
      .addDimension(eventCoordinateField) // Used by analytics/events/query/
      .withCoordinateField(eventCoordinateField); // Used by analytics/events/count and analytics/events/cluster
  }

  if (eventStatus && eventStatus !== "ALL") {
    analyticsRequest = analyticsRequest.withEventStatus(eventStatus);
  }

  return analyticsRequest;
};

export const getCount = async (request) => {
  const d2 = await getD2();
  return await d2.analytics.events.getCount(request);
};

export const loadData = async (request, config = {}) => {
  const d2 = await getD2();
  const response = await d2.analytics.events.getQuery(request);

  const { data, names } = createEventFeatures(response, config);

  return {
    data,
    names,
    response,
  };
};

// If the layer included filters using option sets, this function return an object
// mapping option codes to named used to translate codes in the legend
const getFilterOptionNames = async (filters, headers) => {
  const d2 = await getD2();

  if (!filters) {
    return null;
  }

  // Returns array of option set ids used for filtering
  const optionSets = filters
    .map((filter) => headers.find((header) => header.name === filter.dimension))
    .filter((header) => header.optionSet)
    .map((header) => header.optionSet);

  if (!optionSets.length) {
    return;
  }

  const mappedOptionSets = await Promise.all(
    optionSets.map((id) =>
      d2.models.optionSets
        .get(id, {
          fields: "options[code,displayName~rename(name)]",
        })
        .then((model) => model.options)
        .then((options) =>
          options.reduce((obj, { code, name }) => {
            obj[code] = name;
            return obj;
          }, {})
        )
    )
  );

  // Returns one object with all option codes mapped to names
  return mappedOptionSets.reduce(
    (obj, set) => ({
      ...obj,
      ...set,
    }),
    {}
  );
};

// Empty filter sometimes returned for saved maps
// Dimension without filter and empty items array returns false
const isValidDimension = ({ dimension, filter, items }) =>
  Boolean(dimension && (filter || !items || items.length));

export default eventLoader;
