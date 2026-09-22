import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { getActiveCharities, getUserCharity } from "@/services/charities/charityService";
import { CharityClient } from "@/components/charity/CharityClient";

export const metadata = {
  title: "Charity Management | Digital Heroes",
  description: "Select verified partner charities and configure your contribution percentage.",
};

export default async function CharityPage() {
  const auth = await requireAuth();
  const charities = await getActiveCharities();
  const userCharity = await getUserCharity(auth.user.id);

  return <CharityClient charities={charities} initialUserCharity={userCharity} />;
}
