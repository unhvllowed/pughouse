"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

interface TcgCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  set?: { id: string; name: string };
  rarity?: string;
}

interface TcgSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
}

export default function CartasPage() {
  const [search, setSearch] = useState("");
  const [setNameSearch, setSetNameSearch] = useState("");
  const [illustrator, setIllustrator] = useState("");
  const [rarity, setRarity] = useState("");
  const [category, setCategory] = useState("");
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [setsLoaded, setSetsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"cartas" | "sets">("cartas");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [selectedCard, setSelectedCard] = useState<TcgCard | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    // Cargar sets cuando cambie el idioma o al montar
    const fetchSets = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tcgdex/sets?lang=${lang}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // La API ahora ya viene hidratada y ordenada desde el backend
          setSets(data);
          setSetsLoaded(true);
        }
      } catch (err) {
        console.error("Error cargando sets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
    
    // Si hay una búsqueda activa, podrías querer re-ejecutarla, 
    // pero por ahora solo reseteamos cartas para evitar mezclas de idiomas
    setCards([]);
  }, [lang]);

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
        .catch(() => {})
        .finally(() => setPriceLoading(false));
    }
  }, [selectedCard, lang]);

  const searchCards = async (isNewSearch = true, overrideSetName?: string) => {
    const currentSetName = overrideSetName !== undefined ? overrideSetName : setNameSearch;
    if (!search.trim() && !currentSetName && !illustrator && !rarity && !category) return;
    
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
        setHasMore(data.length === 24); // itemsPerPage is 24 in backend
        setPage(targetPage);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadSets = async () => {
    if (setsLoaded) { setActiveTab("sets"); return; }
    setLoading(true);
    const res = await fetch(`/api/tcgdex/sets?lang=${lang}`);
    const data = await res.json();
    setSets(Array.isArray(data) ? data : []);
    setSetsLoaded(true);
    setLoading(false);
    setActiveTab("sets");
  };

  const addToInventory = async () => {
    if (!selectedCard) return;
    // Pre-fill using the product creation modal flow
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
            <button className={`btn ${activeTab === "sets" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={loadSets}>Ver Sets</button>
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
                      value={setNameSearch}
                      onChange={(e) => {
                        setSetNameSearch(e.target.value);
                        // Opcional: buscar automáticamente al cambiar set
                        // searchCards(true, e.target.value);
                      }}
                    >
                      <option value="">Selecciona un Set</option>
                      {sets.map(set => (
                        <option key={set.id} value={set.name}>{set.name}</option>
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
              {loading ? (
                <div style={{ textAlign: "center", padding: 64, color: "var(--text-muted)" }}>Cargando sets...</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {sets.map((set) => (
                    <div key={set.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}
                      onClick={() => { 
                        setSetNameSearch(set.name); 
                        setActiveTab("cartas"); 
                        setSearch(""); 
                        searchCards(true, set.name); 
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
              )}
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
                <h4 style={{ fontSize: 18, marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Precios de Mercado (USD/EUR)</h4>
                
                {priceLoading ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Cargando datos del mercado...</div>
                ) : cardDetails?.pricing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    
                    {/* TCGPlayer */}
                    {cardDetails.pricing.tcgplayer && (
                      <div style={{ border: "1px solid rgba(33, 150, 243, 0.3)", borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ background: "rgba(33, 150, 243, 0.1)", padding: "12px 16px", fontWeight: 600, color: "#2196F3", fontSize: 16 }}>
                          TCGPlayer (USD)
                        </div>
                        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                          {Object.entries(cardDetails.pricing.tcgplayer).filter(([k,v]) => typeof v === 'object' && v !== null).map(([variant, prices]: [string, any]) => (
                             <div key={variant}>
                               <h5 style={{ textTransform: "capitalize", marginBottom: 8, fontSize: 14, color: "var(--text-secondary)" }}>Foil / Normal: {variant}</h5>
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 13 }}>
                                 <div style={{ background: "var(--bg)", padding: 8, borderRadius: 6 }}>
                                   <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Bajo</div>
                                   <div style={{ fontWeight: 600 }}>{prices.lowPrice ? `$${prices.lowPrice.toFixed(2)}` : "-"}</div>
                                 </div>
                                 <div style={{ background: "var(--bg)", padding: 8, borderRadius: 6 }}>
                                   <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Medio</div>
                                   <div style={{ fontWeight: 600 }}>{prices.midPrice ? `$${prices.midPrice.toFixed(2)}` : "-"}</div>
                                 </div>
                                 <div style={{ background: "var(--bg)", padding: 8, borderRadius: 6 }}>
                                   <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Mercado</div>
                                   <div style={{ fontWeight: 600, color: "#4caf50" }}>{prices.marketPrice ? `$${prices.marketPrice.toFixed(2)}` : "-"}</div>
                                 </div>
                               </div>
                             </div>
                          ))}
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                            Actualizado: {new Date(cardDetails.pricing.tcgplayer.updated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cardmarket */}
                    {cardDetails.pricing.cardmarket && (
                      <div style={{ border: "1px solid rgba(233, 30, 99, 0.3)", borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ background: "rgba(233, 30, 99, 0.1)", padding: "12px 16px", fontWeight: 600, color: "#e91e63", fontSize: 16 }}>
                          Cardmarket (EUR)
                        </div>
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                           <div style={{ background: "var(--bg)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                             <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Tendencia</div>
                             <div style={{ fontSize: 15, fontWeight: 600 }}>{cardDetails.pricing.cardmarket.trend ? `€${cardDetails.pricing.cardmarket.trend.toFixed(2)}` : "-"}</div>
                           </div>
                           <div style={{ background: "var(--bg)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                             <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Promedio 30d</div>
                             <div style={{ fontSize: 15, fontWeight: 600 }}>{cardDetails.pricing.cardmarket.avg30 ? `€${cardDetails.pricing.cardmarket.avg30.toFixed(2)}` : "-"}</div>
                           </div>
                           <div style={{ background: "var(--bg)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                             <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Promedio 7d</div>
                             <div style={{ fontSize: 15, fontWeight: 600 }}>{cardDetails.pricing.cardmarket.avg7 ? `€${cardDetails.pricing.cardmarket.avg7.toFixed(2)}` : "-"}</div>
                           </div>
                           <div style={{ background: "var(--bg)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                             <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Mínimo</div>
                             <div style={{ fontSize: 15, fontWeight: 600, color: "#4caf50" }}>{cardDetails.pricing.cardmarket.low ? `€${cardDetails.pricing.cardmarket.low.toFixed(2)}` : "-"}</div>
                           </div>
                           <div style={{ gridColumn: "span 2", fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginTop: 4 }}>
                            Actualizado: {new Date(cardDetails.pricing.cardmarket.updated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                    
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
