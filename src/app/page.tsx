import Link from "next/link";
import { HomeEventCard } from "@/components/home/home-event-card";
import { HomeHero } from "@/components/home/home-hero";
import { homeContainer, homeQuietLink } from "@/components/home/home-layout";
import { HomeProductCard } from "@/components/home/home-product-card";
import { HomeServices } from "@/components/home/home-services";
import { HOME_SHOWCASE_PRODUCTS, isGenericDemoFeatured } from "@/lib/home-showcase";
import { loadPublicTournamentView } from "@/lib/public-tournament-view";
import { cancelRegistrationRefusal } from "@/lib/tournament-registrations";
import { getHomeContent } from "@/lib/site-content";

export default async function HomePage() {
  const [homeContent, tournamentView] = await Promise.all([
    getHomeContent(),
    loadPublicTournamentView(),
  ]);
  const { tournaments, namesBySlug, registeredSlugs, ownedSlugs, isAdmin } = tournamentView;
  const featured = isGenericDemoFeatured(homeContent.featuredProducts)
    ? HOME_SHOWCASE_PRODUCTS
    : homeContent.featuredProducts.slice(0, 4);

  return (
    <>
      <HomeHero banners={homeContent.banners} />

      <section className={`${homeContainer} flex flex-col gap-8 pt-16 pb-8`}>
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-[32px] font-medium leading-[1.3] text-[#0a0a09] xl:text-[40px]">熱門商品</h2>
          <Link href="/products" className={homeQuietLink}>
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className={`${homeContainer} flex flex-col gap-8 pt-16 pb-8`}>
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-[32px] font-medium leading-[1.3] text-[#0a0a09] xl:text-[40px]">
            即將舉辦的店賽
          </h2>
          <Link href="/tournaments" className={homeQuietLink}>
            全部賽事 →
          </Link>
        </div>
        <p className="text-[16px] leading-[1.65] text-[#625f58]">每週舉辦 Pokémon 標準賽 · 現場報到</p>
        {tournaments.length === 0 ? (
          <p className="text-[16px] text-[#625f58]">暫無即將舉行的店賽</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {tournaments.map((tournament) => (
              <HomeEventCard
                key={tournament.id}
                tournament={tournament}
                playerNames={namesBySlug.get(tournament.slug) ?? []}
                signedUp={registeredSlugs.has(tournament.slug)}
                canCancel={
                  ownedSlugs.has(tournament.slug) && cancelRegistrationRefusal(tournament.status) === null
                }
                showScoreboard={isAdmin}
              />
            ))}
          </div>
        )}
      </section>

      <HomeServices />
    </>
  );
}
