-- Replace the previous street-level shop address with the published building copy.
UPDATE "AboutPageContent"
SET
  "storeAddressZh" = '九龍灣工業中心7樓28室',
  "storeAddressEn" = 'Kowloon Bay Industrial Centre, 7/F Room 28',
  "mapEmbedUrl" = 'https://www.google.com/maps?q=Kowloon+Bay+Industrial+Centre+Room+28+7%2FF+Hong+Kong&hl=zh-HK&z=17&output=embed',
  "showStoreInfo" = true
WHERE
  COALESCE("storeAddressZh", '') LIKE '%宏開道%'
  OR COALESCE("storeAddressEn", '') ILIKE '%Wang Hoi%'
  OR COALESCE("mapEmbedUrl", '') ILIKE '%Wang Hoi%';
