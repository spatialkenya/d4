import { fetchLayer } from "../loaders/layers";

const isNewLayer = (config) => config.id === undefined;

// Load one layer
export const loadLayer = (config) => fetchLayer(config);
