export type R2VideoObject = {
  key: string;
  size: number;
  lastModified: string; // ISO 8601 string
  etag?: string;
};

export type ListR2ObjectsParams = {
  prefix?: string;
  continuationToken?: string;
  pageSize?: number;
};

export type ListR2ObjectsResult = {
  items: R2VideoObject[];
  nextContinuationToken?: string;
};
