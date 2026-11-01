/** One of the 25 district codes, e.g. "COLOMBO". The full list comes from GET /meta/districts. */
export type DistrictCode = string;

export interface District {
  code: DistrictCode;
  name: string;
}
