export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

export type LocationEnv = LocationCoordinates & {
  label: string;
};
