export interface Writing {
  slug: string;
  title: string;
  oneLiner: string;
  date: string;
  url: string;
}

export const SITE = {
  repoBase: "/blockmeet/",
  title: "BLOCKMeet",
  subtitle: "Book a session, let's discuss.",
  timezone: "Asia/Kolkata",
  links: {
    min15: "https://cal.com/yashveer/15min",
    min30: "https://cal.com/yashveer/30min",
  },
  socials: {
    twitter: "https://x.com/yashv_r",
    linkedin: "https://www.linkedin.com/in/yashveersinghh/",
  },
  writings: [
    {
      slug: "india-nightlights-district-panel",
      title: "India Nightlights — District Panel 2012–2024",
      oneLiner:
        "631 districts, 13 years of VIIRS/DMSP satellite radiance data. How India lit up — and where it didn't.",
      date: "2026-03-05",
      url: "/blockmeet/writings/india-nightlights-district-panel.html",
    },
    {
      slug: "anthropic-money-power-politics",
      title: "Anthropic: Money, Power & Political Neutrality",
      oneLiner:
        "A discussion into Anthropic\u2019s $67.3B funding history and whether the \u2018left-wing company\u2019 narrative holds up against the numbers.",
      date: "2026-02-28",
      url: "/blockmeet/writings/anthropic-money-power-politics.html",
    },
  ] as Writing[],
};
