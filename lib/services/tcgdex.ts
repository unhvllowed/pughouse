export async function getTcgSetsMap(lang: string = "es") {
  const sets = await getTcgSets(lang);
  const map: Record<string, string> = {};
  sets.forEach((set: any) => {
    map[set.id] = set.releaseDate || "0000-00-00";
  });
  return map;
}

export async function getTcgSets(lang: string = "es") {
  const TCGDEX_BASE = `https://api.tcgdex.net/v2/${lang}`;

  try {
    const res = await fetch(`${TCGDEX_BASE}/sets`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Error al obtener sets");
    const shallowSets = await res.json();

    if (!Array.isArray(shallowSets)) return [];

    // Hydrate sets to get releaseDate for sorting
    const hydratedSets = await Promise.all(
      shallowSets.map(async (set: any) => {
        try {
          const detailRes = await fetch(`${TCGDEX_BASE}/sets/${set.id}`, {
            next: { revalidate: 604800 }
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return {
              ...set,
              releaseDate: detail.releaseDate,
              serie: detail.serie?.name
            };
          }
        } catch (e) {}
        return set;
      })
    );

    // Sort by releaseDate DESC
    return hydratedSets.sort((a: any, b: any) => {
      const dateA = a.releaseDate || "0000-00-00";
      const dateB = b.releaseDate || "0000-00-00";
      
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return b.id.localeCompare(a.id);
    });
  } catch (error) {
    console.error("Sets error:", error);
    return [];
  }
}
