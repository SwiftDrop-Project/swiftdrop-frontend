import { redirect } from "next/navigation";

/** Old placeholder address: the admin's webhook page is now /admin/webhooks. */
export default function Page() {
  redirect("/admin/webhooks");
}
