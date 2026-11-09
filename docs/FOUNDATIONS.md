# Foundations

Figma file `o26AughBZl9eZvIknlWVwD`, page `0:1` (“00 · Foundations”). Tokens live in `src/styles/foundations.css` and are exposed as Tailwind colors `trtcg-*` (`bg-trtcg-paper`, and the same names for text, border, and shadow). `--foundation-*` aliases point at the same values.

UI type stays Noto Sans TC (`--font-sans`). Hero Latin stays DM Sans (`--font-dm`) and Playfair Display (`--font-playfair`). The Figma text styles name Yuanti TC; that face is not loaded.

## Soft grey → Foundations paper

These Soft fields are intentional variance. This pass does not recolor them.

| Surface | Selector | Soft field (unchanged) | Foundations token |
| --- | --- | --- | --- |
| Storefront | `.storefront-canvas` | `#F7F5EF` | `--trtcg-paper` `#F2EFEB` |
| POS | `.pos-soft` | `#FAF8F3` | `--trtcg-paper` `#F2EFEB` |

Wallpaper URLs are also unchanged: storefront still uses `/brand/home/sparse-cloud-crane-wallpaper.png`, POS still uses `/brand/pos/sparse-cloud-crane-wallpaper.jpg`. New work should use `/brand/foundations/`.

## Storefront Soft (page 4:2)

The public storefront keeps `.storefront-canvas` `#F7F5EF`. Soft frames also paint a few fills that differ from the printed Foundations swatches. This pass uses the Foundations components and tokens, and records the difference:

| Soft frame fill | Foundations token used |
| --- | --- |
| Secondary button `#E6DFFF` | `--trtcg-lavender` `#E8DFF8` |
| WhatsApp FAB `#DDEB9F` | `--trtcg-lime` `#EAF1CA` |
| Quiet wash `rgba(221, 235, 159, 0.42)` | `--trtcg-quiet` (same) |
| Body ink variable `#101015` | `--trtcg-ink` `#191817` |

Homepage hero slides `5:2` and `18:157` share the purple-to-gold atmosphere and the Charizard / Umbreon artwork. The second slide only changes the copy to 店賽報名. Homepage product cards follow interactive component `69:210` (lavender well, foil sweep on hover). The catalog grid on frame `9:16` stays the static card, with Foundations Button and the card shadow.

## Tokens

Printed swatch labels on frame `21:2` are the hex source of truth.

| Token | Hex |
| --- | --- |
| paper | `#F2EFEB` |
| surface | `#FFFFFF` |
| ink | `#191817` |
| lavender | `#E8DFF8` |
| peach | `#F9DBBD` |
| lime | `#EAF1CA` |
| line | `#DCCDAF` |
| muted | `#5E5963` |
| gold | `#C8A24A` |
| header | `#080808` |
| disabled | `#D9D4C9` / `#77736B` |
| badge | `#FFE19A` / border `#E0A328` |
| secondary border | `#6F59C7` |
| quiet | `rgba(221, 235, 159, 0.42)` |
| input border | `#DEDAD4` |
| input well | `#FFF9F0` |

Shadows: Card `0 10px 26px #6F59C721`, Float `0 18px 42px #0000002E`.

Figma variables bound on frame `21:8` currently resolve to a different set (paper `#FFF7EA`, ink `#101015`, lavender `#E6DFFF`, peach `#FFD0A3`, lime `#DDEB9F`). Components in this repo follow the printed labels above. Secondary button fill is `--trtcg-lavender` (`#E8DFF8`), not the variable fill `#E6DFFF`.

## Components

Existing shadcn `Button`, `Input`, and `Badge` keep their current variants, including shadcn `secondary`.

| Control | API |
| --- | --- |
| Button Primary / Secondary / Quiet / Disabled | `FoundationButton` `variant`, or `Button` `variant="primary" \| "foundation-secondary" \| "quiet" \| "disabled"`. 48px, radius 10px, padding 24px. Disabled is non-interactive. |
| Input | `Input variant="foundation"` is the 48px white field. `FoundationField` adds the label and the `#FFF9F0` well (Figma `4:63`). |
| Badge | `Badge variant="foundation"` (Figma `4:67`). |

Internal board: `/demo/foundations`.

## Assets

| File | Source |
| --- | --- |
| `public/brand/foundations/gold-cloud.png` | Figma `37:2`, byte-identical to `public/brand/home/gold-cloud.png` |
| `public/brand/foundations/embossed-energy.jpg` | Figma `37:3` (not in the Soft set) |
| `public/brand/foundations/sparse-cloud-crane-wallpaper.jpg` | Figma `66:2`, byte-identical to the POS tile |
| `public/brand/foundations/sparse-cloud-crane-wallpaper.png` | Byte-identical copy of the storefront tile |
