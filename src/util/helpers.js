import { getInstance as getD2 } from "d2";

const propertyMap = {
  name: "name",
  displayName: "name",
  shortName: "shortName",
  displayShortName: "shortName",
};

export const getDisplayProperty = (d2, displayProperty) => {
  const keyAnalysisDisplayProperty =
    d2.currentUser.settings.keyAnalysisDisplayProperty;
  return (
    propertyMap[keyAnalysisDisplayProperty] ||
    propertyMap[displayProperty] ||
    "name"
  ); // TODO: check
};

export const getDisplayPropertyUrl = () => `displayName~rename(name)`;

const baseFields = [
  "id",
  "user",
  "displayName~rename(name)",
  "longitude",
  "latitude",
  "zoom",
  "basemap",
  "publicAccess",
  "created",
  "lastUpdated",
];

const analysisFields = async () => {
  const d2 = await getD2();
  const namePropertyUrl = await getDisplayPropertyUrl(d2);
  return [
    "*",
    `columns[dimension,filter,items[dimensionItem~rename(id),dimensionItemType,${namePropertyUrl}]]`,
    `rows[dimension,filter,items[dimensionItem~rename(id),dimensionItemType,${namePropertyUrl}]]`,
    `filters[dimension,filter,items[dimensionItem~rename(id),dimensionItemType,${namePropertyUrl}]]`,
    "organisationUnits[id,path]", // Added to retrieve org unit paths
    "dataDimensionItems",
    `program[id,${namePropertyUrl}]`,
    "programStage[id,displayName~rename(name)]",
    "legendSet[id,displayName~rename(name)]",
    "trackedEntityType[id,displayName~rename(name)]",
    "organisationUnitSelectionMode",
    "!href",
    "!publicAccess",
    "!rewindRelativePeriods",
    "!userOrganisationUnit",
    "!userOrganisationUnitChildren",
    "!userOrganisationUnitGrandChildren",
    "!externalAccess",
    "!access",
    "!relativePeriods",
    "!columnDimensions",
    "!rowDimensions",
    "!filterDimensions",
    "!user",
    "!organisationUnitGroups",
    "!itemOrganisationUnitGroups",
    "!userGroupAccesses",
    "!indicators",
    "!dataElements",
    "!dataElementOperands",
    "!dataElementGroups",
    "!dataSets",
    "!periods",
    "!organisationUnitLevels",
    "!sortOrder",
    "!topLimit",
  ];
};

export const mapFields = async () => {
  const fields = await analysisFields();
  return `${baseFields.join(",")}, mapViews[${fields.join(",")}]`;
};
