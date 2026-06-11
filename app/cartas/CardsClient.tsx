"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { TcgCard, TcgSet } from "@/lib/types";

// Types are now imported from @/lib/types

export default function CardsClient({
  initialSets
}: {
  initialSets: TcgSet[]
}) {
  const [search, setSearch] = useState("");
  const [setNameSearch, setSetNameSearch] = useState("");
  const [setIdSearch, setSetIdSearch] = useState("");
  const [illustrator, setIllustrator] = useState("");
  const [rarity, setRarity] = useState("");
  const [category, setCategory] = useState("");
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [sets] = useState<TcgSet[]>(initialSets);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"cartas" | "sets">("cartas");
  const [lang, setLang] = useState<"es" | "en">("en");
  const [selectedCard, setSelectedCard] = useState<TcgCard | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceTab, setPriceTab] = useState<"tcgmatch" | "tcgplayer" | "cardmarket">("tcgmatch");

  useEffect(() => {
    if (selectedCard) {
      setCardDetails(null);
      setPriceLoading(true);
      fetch(`/api/prices/${selectedCard.id}?lang=${lang}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setCardDetails(data);
          }
        })
        .catch(() => { })
        .finally(() => setPriceLoading(false));
    }
  }, [selectedCard, lang]);

  useEffect(() => {
    if (cardDetails) {
      if (cardDetails.tcgmatch && cardDetails.tcgmatch.stats && cardDetails.tcgmatch.listings?.length > 0) {
        setPriceTab("tcgmatch");
      } else if (cardDetails.pricing?.tcgplayer && Object.keys(cardDetails.pricing.tcgplayer).length > 0) {
        setPriceTab("tcgplayer");
      } else if (cardDetails.pricing?.cardmarket) {
        setPriceTab("cardmarket");
      } else {
        setPriceTab("tcgmatch");
      }
    }
  }, [cardDetails]);

  const searchCards = async (isNewSearch = true, overrideSetName?: string, overrideSetId?: string) => {
    const currentSetName = overrideSetName !== undefined ? overrideSetName : setNameSearch;
    const currentSetId = overrideSetId !== undefined ? overrideSetId : setIdSearch;
    if (!search.trim() && !currentSetName && !currentSetId && !illustrator && !rarity && !category) return;

    const targetPage = isNewSearch ? 1 : page + 1;

    if (isNewSearch) {
      setLoading(true);
      setCards([]);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    const params = new URLSearchParams();
    params.set("lang", lang);
    if (search) params.set("name", search);
    if (currentSetId) params.set("setId", currentSetId);
    if (currentSetName) params.set("setName", currentSetName);
    if (illustrator) params.set("illustrator", illustrator);
    if (rarity) params.set("rarity", rarity);
    if (category) params.set("category", category);
    params.set("page", targetPage.toString());

    try {
      const res = await fetch(`/api/tcgdex/cards?${params}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        if (isNewSearch) {
          setCards(data);
        } else {
          setCards(prev => [...prev, ...data]);
        }
        setHasMore(data.length === 24);
        setPage(targetPage);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const addToInventory = async () => {
    if (!selectedCard) return;
    const name = encodeURIComponent(`${selectedCard.name} - ${selectedCard.set?.name || ""}`.trim());
    window.location.href = `/inventario?prefill=${name}`;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="main-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <h2>🔍 Buscar Cartas Pokémon</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Idioma API:</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`btn btn-sm ${lang === "es" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLang("es")}
                  style={{ padding: "2px 8px", fontSize: 11 }}
                >ES</button>
                <button
                  className={`btn btn-sm ${lang === "en" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLang("en")}
                  style={{ padding: "2px 8px", fontSize: 11 }}
                >EN</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className={`btn ${activeTab === "cartas" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setActiveTab("cartas")}>Buscar Cartas</button>
            <button className={`btn ${activeTab === "sets" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setActiveTab("sets")}>Ver Sets</button>
          </div>
        </div>
        <div className="page-content">
          {activeTab === "cartas" ? (
            <>
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div className="search-input-wrap" style={{ flex: "2", minWidth: 150 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>Nombre / Pkmn</div>
                    <span className="search-icon" style={{ top: 28 }}>🔍</span>
                    <input
                      className="form-input"
                      placeholder="ej: Pikachu"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchCards(true)}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>Set / Expansión</div>
                    <select
                      className="form-input"
                      value={setIdSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSetIdSearch(val);
                        const matched = sets.find(s => s.id === val);
                        setSetNameSearch(matched ? matched.name : "");
                      }}
                    >
                      <option value="">Selecciona un Set</option>
                      {sets.map(set => (
                        <option key={set.id} value={set.id}>{set.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>Rareza</div>
                    <select className="form-input" value={rarity} onChange={(e) => setRarity(e.target.value)}>
                      <option value="">Todas</option>
                      <option value="Common">Común</option>
                      <option value="Uncommon">Infrecuente</option>
                      <option value="Rare">Rara</option>
                      <option value="Ultra Rare">Ultra Rara</option>
                      <option value="Secret Rare">Secreta</option>
                      <option value="Illustration Rare">Illustration Rare</option>
                      <option value="Special Illustration Rare">SAR</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>Categoría</div>
                    <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Todas</option>
                      <option value="Pokemon">Pokémon</option>
                      <option value="Trainer">Entrenador</option>
                      <option value="Energy">Energía</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>Ilustrador</div>
                    <input
                      className="form-input"
                      placeholder="ej: tetsuya"
                      value={illustrator}
                      onChange={(e) => setIllustrator(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchCards(true)}
                    />
                  </div>
                  <button className="btn btn-primary" style={{ height: 42, minWidth: 100 }} onClick={() => searchCards(true)} disabled={loading}>
                    {loading ? "..." : "Buscar"}
                  </button>
                </div>
              </div>

              {cards.length === 0 && !loading ? (
                <div className="empty-state">
                  <div className="empty-icon">🎴</div>
                  <h3>Busca cartas de Pokémon TCG</h3>
                  <p>Ingresa el nombre de una carta o el ID del set y presiona Buscar</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div className="card-grid">
                    {cards.map((card, idx) => (
                      <div key={`${card.id}-${idx}`} className="tcg-card" onClick={() => setSelectedCard(card)}>
                        {card.image ? (
                          <img
                            src={`${card.image}/low.webp`}
                            alt={card.name}
                            loading="lazy"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              if (el.src.includes('/es/')) {
                                el.src = el.src.replace('/es/', '/en/');
                              } else {
                                el.style.display = "none";
                              }
                            }}
                          />
                        ) : (
                          <div style={{ aspectRatio: "2/3", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎴</div>
                        )}
                        <div className="tcg-card-body">
                          <div className="tcg-card-name">{card.name}</div>
                          <div className="tcg-card-set">{card.set?.name || card.id} · #{card.localId}</div>
                          {card.rarity && <span className="badge badge-purple" style={{ marginTop: 4, fontSize: 10 }}>{card.rarity}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => searchCards(false)}
                        disabled={loadingMore}
                        style={{ minWidth: 200 }}
                      >
                        {loadingMore ? "Cargando más..." : "Cargar más cartas"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div>
              <h3 className="section-title" style={{ marginBottom: 16 }}>Todos los Sets de Pokémon TCG</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {sets.map((set) => (
                  <div key={set.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}
                    onClick={() => {
                      setSetIdSearch(set.id);
                      setSetNameSearch(set.name);
                      setActiveTab("cartas");
                      setSearch("");
                      searchCards(true, set.name, set.id);
                    }}>
                    {set.logo ? (
                      <img src={`${set.logo}.webp`} alt={set.name} style={{ height: 40, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: 28 }}>📦</span>
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{set.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{set.id} · {set.cardCount?.total || "?"} cartas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal" style={{ maxWidth: 800, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selectedCard.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCard(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxHeight: "70vh", overflowY: "auto" }}>
              {/* Columna Izquierda: Imagen y Detalles Básicos */}
              <div style={{ textAlign: "center" }}>
                {selectedCard.image && (
                  <img
                    src={`${selectedCard.image}/high.webp`}
                    alt={selectedCard.name}
                    style={{ maxWidth: "100%", borderRadius: 12, marginBottom: 16 }}
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      if (el.src.includes('/es/')) el.src = el.src.replace('/es/', '/en/');
                      else el.style.display = "none";
                    }}
                  />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left", background: "var(--bg-hover)", padding: 12, borderRadius: 8 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Set</p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{selectedCard.set?.name} ({selectedCard.set?.id})</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Número</p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>#{selectedCard.localId} {cardDetails?.set?.cardCount?.official ? `/ ${cardDetails.set.cardCount.official}` : ""}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Rareza</p>
                    {selectedCard.rarity ? <span className="badge badge-purple">{selectedCard.rarity}</span> : "-"}
                  </div>
                  {cardDetails?.illustrator && (
                    <div style={{ gridColumn: "span 2" }}>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Ilustrador</p>
                      <p style={{ fontSize: 14 }}>{cardDetails.illustrator}</p>
                    </div>
                  )}
                  {cardDetails?.hp && (
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>HP / PS</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{cardDetails.hp}</p>
                    </div>
                  )}
                  {cardDetails?.types && cardDetails.types.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Tipos</p>
                      <p style={{ fontSize: 14 }}>{cardDetails.types.join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Precios y Mercado */}
              <div>
                <h4 style={{ fontSize: 18, marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Precios de Mercado</h4>

                {priceLoading ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Cargando datos del mercado...</div>
                ) : cardDetails ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    
                    {/* Price Source Tabs */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8, overflowX: "auto" }}>
                      <button
                        className={`btn btn-sm ${priceTab === "tcgmatch" ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setPriceTab("tcgmatch")}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        🇨🇱 TCGMatch {(cardDetails.tcgmatch?.stats?.count !== undefined) ? `(${cardDetails.tcgmatch.stats.count})` : ""}
                      </button>
                      <button
                        className={`btn btn-sm ${priceTab === "tcgplayer" ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setPriceTab("tcgplayer")}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        🇺🇸 TCGPlayer
                      </button>
                      <button
                        className={`btn btn-sm ${priceTab === "cardmarket" ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setPriceTab("cardmarket")}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        🇪🇺 Cardmarket
                      </button>
                    </div>

                    {/* Active Price Tab Content */}
                    <div style={{ minHeight: 180 }}>
                      
                      {/* TCGMatch (Chile) */}
                      {priceTab === "tcgmatch" && (
                        cardDetails.tcgmatch && cardDetails.tcgmatch.stats ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, textAlign: "center" }}>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Mínimo</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#4caf50" }}>
                                  {cardDetails.tcgmatch.stats.lowest ? `$${cardDetails.tcgmatch.stats.lowest.toLocaleString("es-CL")}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Promedio</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                  {cardDetails.tcgmatch.stats.average ? `$${cardDetails.tcgmatch.stats.average.toLocaleString("es-CL")}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Máximo</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                  {cardDetails.tcgmatch.stats.highest ? `$${cardDetails.tcgmatch.stats.highest.toLocaleString("es-CL")}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Último Vendido</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#2196F3" }}>
                                  {cardDetails.tcgmatch.stats.lastSold ? `$${cardDetails.tcgmatch.stats.lastSold.toLocaleString("es-CL")}` : "-"}
                                </div>
                              </div>
                            </div>

                            {cardDetails.tcgmatch.listings && cardDetails.tcgmatch.listings.length > 0 ? (
                              <>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                                  Listados Recientes
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                                  {cardDetails.tcgmatch.listings.map((listing: any, i: number) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "var(--bg-hover)", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)" }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{listing.seller}</div>
                                        <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>{listing.status} · {listing.language}</div>
                                      </div>
                                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>
                                        ${listing.price.toLocaleString("es-CL")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 12, background: "var(--bg-hover)", borderRadius: 6 }}>
                                No hay listados activos en TCGMatch.cl.
                              </div>
                            )}
                            <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>
                              * Precios referenciales de TCGMatch.cl
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-hover)", borderRadius: 8, fontSize: 13 }}>
                            No hay información de precios en TCGMatch para esta carta.
                          </div>
                        )
                      )}

                      {/* TCGPlayer (USD) */}
                      {priceTab === "tcgplayer" && (
                        cardDetails.pricing?.tcgplayer && Object.keys(cardDetails.pricing.tcgplayer).length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ maxHeight: 250, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
                              {Object.entries(cardDetails.pricing.tcgplayer).filter(([k, v]) => typeof v === 'object' && v !== null).map(([variant, prices]: [string, any]) => (
                                <div key={variant} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 8, background: "var(--bg-hover)" }}>
                                  <h5 style={{ textTransform: "capitalize", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 4 }}>Variante: {variant}</h5>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, textAlign: "center", fontSize: 11 }}>
                                    <div style={{ background: "var(--bg-primary)", padding: 6, borderRadius: 4 }}>
                                      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>Bajo</div>
                                      <div style={{ fontWeight: 600 }}>{prices.low ? `$${prices.low.toFixed(2)}` : "-"}</div>
                                    </div>
                                    <div style={{ background: "var(--bg-primary)", padding: 6, borderRadius: 4 }}>
                                      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>Medio</div>
                                      <div style={{ fontWeight: 600 }}>{prices.mid ? `$${prices.mid.toFixed(2)}` : "-"}</div>
                                    </div>
                                    <div style={{ background: "var(--bg-primary)", padding: 6, borderRadius: 4 }}>
                                      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>Alto</div>
                                      <div style={{ fontWeight: 600 }}>{prices.high ? `$${prices.high.toFixed(2)}` : "-"}</div>
                                    </div>
                                    <div style={{ background: "var(--bg-primary)", padding: 6, borderRadius: 4 }}>
                                      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>Mercado</div>
                                      <div style={{ fontWeight: 600, color: "#2196F3" }}>{prices.market ? `$${prices.market.toFixed(2)}` : "-"}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {cardDetails.pricing.tcgplayer.updated && (
                              <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>
                                Actualizado: {new Date(cardDetails.pricing.tcgplayer.updated).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-hover)", borderRadius: 8, fontSize: 13 }}>
                            No hay información de precios en TCGPlayer para esta carta.
                          </div>
                        )
                      )}

                      {/* Cardmarket (EUR) */}
                      {priceTab === "cardmarket" && (
                        cardDetails.pricing?.cardmarket ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, textAlign: "center" }}>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Mínimo</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#4caf50" }}>
                                  {cardDetails.pricing.cardmarket.low ? `€${cardDetails.pricing.cardmarket.low.toFixed(2)}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Promedio</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                  {cardDetails.pricing.cardmarket.mid ? `€${cardDetails.pricing.cardmarket.mid.toFixed(2)}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Tendencia</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                  {cardDetails.pricing.cardmarket.high ? `€${cardDetails.pricing.cardmarket.high.toFixed(2)}` : "-"}
                                </div>
                              </div>
                              <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Mercado</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#2196F3" }}>
                                  {cardDetails.pricing.cardmarket.market ? `€${cardDetails.pricing.cardmarket.market.toFixed(2)}` : "-"}
                                </div>
                              </div>
                            </div>
                            {cardDetails.pricing.cardmarket.updated && (
                              <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "right" }}>
                                Actualizado: {new Date(cardDetails.pricing.cardmarket.updated).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-hover)", borderRadius: 8, fontSize: 13 }}>
                            No hay información de precios en Cardmarket para esta carta.
                          </div>
                        )
                      )}

                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-hover)", borderRadius: 8 }}>
                    Esta carta no cuenta con cotizaciones de mercado oficiales actualmente.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: 24, padding: "16px 24px" }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCard(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={addToInventory}>📦 Agregar al Inventario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
