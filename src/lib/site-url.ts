const fallbackSiteUrl = "https://rankcues-preview.bricy957711.workers.dev";

export const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl).replace(/\/$/, "");
