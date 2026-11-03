/** JSON shape of every paged list (backend shared.web.PageResponse). `page` is 0-based. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
