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
      slug: "neutral-ai",
      title: "Neutral AI",
      oneLiner:
        "A discussion into Anthropic\u2019s $67.3B funding history and whether the \u2018left-wing company\u2019 narrative holds up.",
      date: "2026-02-28",
      url: "/blockmeet/writings/neutral-ai.html",
    },
  ] as Writing[],
};
