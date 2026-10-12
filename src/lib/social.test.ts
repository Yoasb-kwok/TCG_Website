import assert from "node:assert/strict";
import test from "node:test";
import { resolveSocialHref, resolveSocialLinks, type SocialLinkSlot } from "./social";

const SLOTS: SocialLinkSlot[] = [
  {
    id: "instagram",
    label: "Instagram",
    accessibleName: "前往 Instagram",
    href: "",
    icon: "instagram",
    envVar: "SOCIAL_INSTAGRAM_URL",
  },
  {
    id: "facebook",
    label: "Facebook",
    accessibleName: "前往 Facebook",
    href: "",
    icon: "facebook",
    envVar: "SOCIAL_FACEBOOK_URL",
  },
];

test("blank and unsafe social URLs are hidden", () => {
  assert.equal(resolveSocialHref(""), null);
  assert.equal(resolveSocialHref("   "), null);
  assert.equal(resolveSocialHref("javascript:alert(1)"), null);
  assert.equal(resolveSocialHref("ftp://files.example.com/card"), null);
  assert.equal(resolveSocialHref("not a url"), null);
});

test("http(s) profile URLs are kept, and a bare host gets https", () => {
  assert.equal(
    resolveSocialHref("https://www.instagram.com/tcghk/"),
    "https://www.instagram.com/tcghk/",
  );
  assert.equal(
    resolveSocialHref("instagram.com/tcghk"),
    "https://instagram.com/tcghk",
  );
  assert.equal(resolveSocialHref("http://facebook.com/tcghk"), "http://facebook.com/tcghk");
});

test("empty config shows no Instagram or Facebook links", () => {
  const links = resolveSocialLinks({
    env: { SOCIAL_INSTAGRAM_URL: "", SOCIAL_FACEBOOK_URL: undefined },
    slots: SLOTS,
    whatsappHref: null,
  });
  assert.deepEqual(links, []);
});

test("env URLs override empty slots and invalid values stay hidden", () => {
  const links = resolveSocialLinks({
    env: {
      SOCIAL_INSTAGRAM_URL: "https://instagram.com/tcghk",
      SOCIAL_FACEBOOK_URL: "javascript:alert(1)",
    },
    slots: SLOTS,
    whatsappHref: null,
  });
  assert.deepEqual(
    links.map((link) => link.id),
    ["instagram"],
  );
  assert.equal(links[0]?.href, "https://instagram.com/tcghk");
  assert.equal(links[0]?.accessibleName, "前往 Instagram");
});

test("an empty env value hides a URL written in the slot", () => {
  const links = resolveSocialLinks({
    env: { SOCIAL_INSTAGRAM_URL: "" },
    slots: [
      {
        ...SLOTS[0],
        href: "https://instagram.com/from-code",
      },
    ],
    whatsappHref: null,
  });
  assert.deepEqual(links, []);
});

test("WhatsApp is listed only when a wa.me link resolves", () => {
  const withNumber = resolveSocialLinks({
    env: {},
    slots: SLOTS,
    whatsappHref: "https://wa.me/85266094893",
  });
  assert.equal(withNumber.at(-1)?.id, "whatsapp");
  assert.equal(withNumber.at(-1)?.href, "https://wa.me/85266094893");
  assert.equal(withNumber.at(-1)?.accessibleName, "WhatsApp 聯絡");

  const without = resolveSocialLinks({
    env: {},
    slots: SLOTS,
    whatsappHref: null,
  });
  assert.equal(
    without.some((link) => link.id === "whatsapp"),
    false,
  );
});

test("a new slot is picked up without changing the resolver", () => {
  const links = resolveSocialLinks({
    env: { SOCIAL_YOUTUBE_URL: "youtube.com/@tcghk" },
    slots: [
      ...SLOTS,
      {
        id: "youtube",
        label: "YouTube",
        accessibleName: "前往 YouTube",
        href: "",
        icon: "youtube",
        envVar: "SOCIAL_YOUTUBE_URL",
      },
    ],
    whatsappHref: null,
  });
  assert.equal(links.length, 1);
  assert.equal(links[0]?.id, "youtube");
  assert.equal(links[0]?.href, "https://youtube.com/@tcghk");
  assert.equal(links[0]?.icon, "youtube");
});
