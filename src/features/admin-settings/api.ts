
import { apiFetch } from "@/lib/api/client";

export type CompanyDetails = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  headOfficeAddress: string;
  registrationNumber: string;
};

export const adminSettingsApi = {
  getCompanyDetails: () =>
    apiFetch<CompanyDetails>("/admin/settings/company"),

  updateCompanyDetails: (details: CompanyDetails) =>
    apiFetch<CompanyDetails>("/admin/settings/company", {
      method: "PUT",
      body: details,
    }),
};

export type DeliverySettings = {
  pickupStart: string;
  pickupEnd: string;
  sameDayCutoff: string;
  operatingDays: string[];
  maxWeightKg: number | null;
  maxLengthCm: number | null;
  maxWidthCm: number | null;
  maxHeightCm: number | null;
  failedAttempts: number;
};

export const deliverySettingsApi = {
  get: () =>
    apiFetch<DeliverySettings>("/admin/settings/delivery"),

  update: (settings: DeliverySettings) =>
    apiFetch<DeliverySettings>("/admin/settings/delivery", {
      method: "PUT",
      body: settings,
    }),
};


export type NotificationSettings = {
  parcelStatusEmails: boolean;
  merchantDecisionEmails: boolean;
  senderName: string;
};

export const notificationSettingsApi = {
  get: () =>
    apiFetch<NotificationSettings>("/admin/settings/notifications"),

  update: (settings: NotificationSettings) =>
    apiFetch<NotificationSettings>("/admin/settings/notifications", {
      method: "PUT",
      body: settings,
    }),
};

export type SystemInformation = {
  applicationVersion: string;
  environment: string;
  databaseStatus: string;
  rabbitMqStatus: string;
  outboxRelayStatus: string;
};

export const systemInformationApi = {
  get: () =>
    apiFetch<SystemInformation>("/admin/settings/system-info"),
};
