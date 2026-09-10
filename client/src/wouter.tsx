import { useEffect } from "react";
import { useLocation } from "wouter";
import { event, setAnalyticsUser } from "./track-event";

export function WouterTracker({ user }: { user: string | undefined }) {
  const [location] = useLocation();

  useEffect(() => {
    if (user) {
      setAnalyticsUser(user);
    }
  }, [user]);

  useEffect(() => {
    event({
      user: user ?? "",
      type: "page_load",
      page: location,
    });
  }, [location]);

  return null;
}
