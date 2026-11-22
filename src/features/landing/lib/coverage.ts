/**
 * The 25 districts of Sri Lanka grouped by province, for the landing page's coverage section.
 * Names match the backend `District` display names (GET /meta/districts). Static, so the section
 * never depends on a request.
 */
export const PROVINCES: { name: string; districts: string[] }[] = [
  { name: "Western", districts: ["Colombo", "Gampaha", "Kalutara"] },
  { name: "Central", districts: ["Kandy", "Matale", "Nuwara Eliya"] },
  { name: "Southern", districts: ["Galle", "Matara", "Hambantota"] },
  { name: "Northern", districts: ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"] },
  { name: "Eastern", districts: ["Ampara", "Batticaloa", "Trincomalee"] },
  { name: "North Western", districts: ["Kurunegala", "Puttalam"] },
  { name: "North Central", districts: ["Anuradhapura", "Polonnaruwa"] },
  { name: "Uva", districts: ["Badulla", "Monaragala"] },
  { name: "Sabaragamuwa", districts: ["Kegalle", "Ratnapura"] },
];

export const DISTRICT_COUNT = PROVINCES.reduce((total, province) => total + province.districts.length, 0);
