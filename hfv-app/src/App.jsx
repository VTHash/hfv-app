// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Star, StarOff, TrendingUp, TrendingDown,
  Bookmark, Compass, User, Grid, Image as ImageIcon,
  Building2, BarChart2, RefreshCw, Info
} from "lucide-react";

// ---------- helper: call Netlify Functions (NO direct CMC calls) ----------
async function cmcFn(fnName, params = {}) {
  if (!fnName) throw new Error("cmcFn:missing function name");
  const url = new URL(`/.netlify/functions/${fnName}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  console.log("→ calling", url.toString());
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
const NumberText = ({ children, className = "" }) => (
  <span className={`hfv-num ${className}`}>{children}</span>
);

// ---------- Global Stats ----------
function GlobalStats({ convert }) {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let on = true;
    setErr(null);
    cmcFn("cmc-global", { convert: (convert || "USD").toUpperCase() })
      .then((j) => on && setStats(j))
      .catch((e) => on && setErr(e));
    return () => { on = false; };
  }, [convert]);

  const q = stats?.quote?.[convert?.toUpperCase()];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <StatCard label="Global Market Cap" value={q ? `$${Math.round(q.total_market_cap).toLocaleString()}` : "—"} />
      <StatCard label="24h Volume" value={q ? `$${Math.round(q.total_volume_24h).toLocaleString()}` : "—"} />
      <StatCard label="BTC Dominance" value={typeof stats?.btc_dominance === "number" ? `${stats.btc_dominance.toFixed(2)}%` : "—"} />
      <StatCard label="ETH Dominance" value={typeof stats?.eth_dominance === "number" ? `${stats.eth_dominance.toFixed(2)}%` : "—"} />
      {err && <div className="col-span-full text-sm hfv-danger">{String(err.message)}</div>}
    </div>
  );
}
function StatCard({ label, value }) {
  return (
    <div className="hfv-card hfv-pulse p-4">
      <div className="hfv-chip mb-1">{label}</div>
      <div className="hfv-title-sm"><NumberText>{value}</NumberText></div>
    </div>
  );
}

// ---------- Markets ----------
function CryptoTab({ vs, query, favs, onToggleFav, onSelectCoin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchList = async () => {
    setLoading(true); setErr(null);
    try {
      const j = await cmcFn("cmc-markets", { start: 1, limit: 100, convert: vs.toUpperCase() });
      const mapped = (j || []).map((x) => ({
        id: x.id,
        name: x.name,
        symbol: x.symbol,
        price: x.quote?.[vs.toUpperCase()]?.price,
        change24h: x.quote?.[vs.toUpperCase()]?.percent_change_24h,
        marketcap: x.quote?.[vs.toUpperCase()]?.market_cap,
        image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${x.id}.png`,
      }));
      setItems(mapped);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [vs]);
  useEffect(() => {
    const t = setInterval(fetchList, 90_000);
    return () => clearInterval(t);
  }, [vs]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((c) => (c.name + " " + c.symbol).toLowerCase().includes(q));
  }, [items, query]);

  return (
    <section className="hfv-card hfv-section">
      <div className="hfv-section-head">
        <h2 className="hfv-title flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Cryptocurrency</h2>
        <span className="hfv-pill">Live</span>
        <button onClick={fetchList} className="hfv-btn ml-auto"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-12 gap-2 hfv-subtle px-4 py-2">
        <div className="col-span-6">Coin</div>
        <div className="col-span-3 text-right hfv-hide-xs">Price</div>
        <div className="col-span-3 text-right">24h</div>
      </div>

      <div className="hfv-divider" />

      {loading && <div className="p-4 hfv-subtle">Loading markets…</div>}
      {err && <div className="p-4 hfv-danger">{String(err.message)}</div>}

      {!loading && !err && filtered.map((c) => {
        const up = (c.change24h ?? 0) >= 0;
        return (
          <button
            key={c.id + c.symbol}
            className="hfv-row hfv-hover flex items-center w-full px-4"
            onClick={() => onSelectCoin(c)}
          >
            <div className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFav(c.symbol); }}
                className="hfv-icon-btn"
                aria-label="Toggle favorite"
                title="Toggle favorite"
              >
                {favs.has(c.symbol) ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4 hfv-dim" />}
              </button>

              {c.image
                ? <img src={c.image} alt={c.symbol} className="w-9 h-9 rounded-lg object-cover hfv-glow" />
                : <div className="w-9 h-9 rounded-lg hfv-glow" />}

              <div>
                <div className="hfv-strong">{c.name}</div>
                <div className="hfv-subtle">{c.symbol}</div>
              </div>
            </div>

            <div className="hidden md:block w-36 text-right">
              <NumberText>${c.price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</NumberText>
            </div>

            <div className={`w-28 text-right ${up ? "hfv-up" : "hfv-down"}`}>
              <span className="inline-flex items-center justify-end gap-1">
                {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <NumberText>{(c.change24h ?? 0).toFixed(2)}%</NumberText>
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
}

// ---------- Categories / NFT ----------
function CategoriesTab() {
  return (
    <section className="hfv-card hfv-section p-4">
      <h2 className="hfv-title flex items-center gap-2 mb-2"><Grid className="w-5 h-5" /> Categories</h2>
      <div className="hfv-subtle">Connect to your provider’s categories endpoint later (latest snapshot only).</div>
    </section>
  );
}
function NFTTab() {
  return (
    <section className="hfv-card hfv-section p-4">
      <h2 className="hfv-title flex items-center gap-2 mb-2"><ImageIcon className="w-5 h-5" /> NFT</h2>
      <div className="hfv-subtle">If your plan includes NFT APIs, fetch latest on demand only (no storage).</div>
    </section>
  );
}

// ---------- Exchanges ----------
function ExchangesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let on = true;
    setErr(null);
    cmcFn("cmc-exchanges")
      .then((j) => on && setItems(j || []))
      .catch((e) => on && setErr(e))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, []);

  return (
    <section className="hfv-card hfv-section p-4">
      <h2 className="hfv-title flex items-center gap-2 mb-3"><Building2 className="w-5 h-5" /> Exchanges</h2>
      {loading && <div className="hfv-subtle">Loading exchanges…</div>}
      {err && <div className="hfv-danger">{String(err.message)}</div>}
      {!loading && !err && (
        <div className="space-y-2">
          {items.map((ex) => (
            <div key={ex.id} className="hfv-card hfv-hover p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://s2.coinmarketcap.com/static/img/exchanges/64x64/${ex.id}.png`}
                  className="w-8 h-8 rounded hfv-glow"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div>
                  <div className="hfv-strong">{ex.name}</div>
                  <div className="hfv-subtle">Markets: {ex.num_market_pairs}</div>
                </div>
              </div>
              <div className="text-xs">24h Vol: <NumberText>${ex?.quote?.USD?.volume_24h?.toLocaleString?.() || "—"}</NumberText></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Coin Detail ----------
function CoinDetail({ coin, vs, onClose }) {
  const [info, setInfo] = useState(null);
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let on = true;
    setErr(null);
    cmcFn("cmc-coin", { symbol: coin.symbol, convert: vs.toUpperCase() })
      .then(({ info, quote }) => { if (!on) return; setInfo(info); setQuote(quote); })
      .catch((e) => on && setErr(e));
    return () => { on = false; };
  }, [coin.symbol, vs]);

  const price = quote?.quote?.[vs.toUpperCase()]?.price;
  const change24h = quote?.quote?.[vs.toUpperCase()]?.percent_change_24h;

  return (
    <section className="mt-6 hfv-card hfv-section p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {info?.logo
            ? <img src={info.logo} alt={coin.symbol} className="w-8 h-8 rounded hfv-glow" />
            : <div className="w-8 h-8 rounded hfv-glow" />}
          <h3 className="hfv-title">{coin.name} <span className="hfv-subtle">({coin.symbol})</span></h3>
        </div>
        <button onClick={onClose} className="hfv-btn hfv-ghost">Close</button>
      </div>

      {err && <div className="hfv-danger mb-2">{String(err.message)}</div>}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="hfv-card p-3">
          <div className="hfv-chip mb-1">Price</div>
          <div className="hfv-title-sm"><NumberText>{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : "—"}</NumberText></div>
        </div>
        <div className="hfv-card p-3">
          <div className="hfv-chip mb-1">24h Change</div>
          <div className={typeof change24h === "number" && change24h >= 0 ? "hfv-up" : "hfv-down"}>
            <NumberText>{typeof change24h === "number" ? `${change24h.toFixed(2)}%` : "—"}</NumberText>
          </div>
        </div>
        <div className="hfv-card p-3">
          <div className="hfv-chip mb-1">Market Cap</div>
          <div className="hfv-title-sm"><NumberText>{quote?.quote?.[vs.toUpperCase()]?.market_cap ? `$${quote.quote[vs.toUpperCase()].market_cap.toLocaleString()}` : "—"}</NumberText></div>
        </div>
      </div>

      {info?.urls?.website?.length ? (
        <a href={info.urls.website[0]} target="_blank" rel="noreferrer" className="hfv-link mt-3 inline-flex items-center gap-2">
          <Info className="w-4 h-4" /> Official Site
        </a>
      ) : null}

      <div className="hfv-subtle mt-3">Latest values only • No history stored</div>
    </section>
  );
}

// ---------- Nav ----------
function TopBar({ activeTop, setActiveTop, query, setQuery }) {
  const tabs = [
    { key: "crypto", label: "Cryptocurrency" },
    { key: "categories", label: "Categories" },
    { key: "nft", label: "NFT" },
    { key: "exchanges", label: "Exchanges" },
  ];
  return (
    <header className="hfv-topbar">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 hfv-brand">
            <div className="hfv-logo" />
            <h1 className="hfv-title-lg">HFV</h1>
          </div>
          <div className="ml-auto flex items-center gap-3 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="hfv-input-icon" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, id, or symbol..."
                inputMode="search"
                className="hfv-input"
              />
            </div>
            <span className="hfv-pill">Latest Only</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTop(t.key)}
              className={`hfv-tab ${activeTop === t.key ? "is-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
function BottomNav({ activeBottom, setActiveBottom }) {
  const items = [
    { key: "market", label: "Market", icon: BarChart2 },
    { key: "portfolio", label: "Portfolio", icon: Bookmark },
    { key: "search", label: "Search", icon: Search },
    { key: "explore", label: "Explore", icon: Compass },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <nav className="hfv-bottom" role="navigation" aria-label="Bottom navigation">
      <div className="max-w-6xl mx-auto hfv-bottom-grid">
        {items.map(({ key, label, icon: Icon }) => {
          const active = activeBottom === key;
          return (
            <button
              key={key}
              onClick={() => setActiveBottom(key)}
              className={`hfv-bottom-btn ${active ? "hfv-bottom-btn--active hfv-pulse" : ""}`}
              aria-label={label}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- App ----------
export default function App() {
  const [activeTop, setActiveTop] = useState("crypto");
  const [activeBottom, setActiveBottom] = useState("market");
  const [vs, setVs] = useState("usd");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [favs, setFavs] = useState(() => new Set(["HFV"]));
  const toggleFav = (sym) =>
    setFavs((prev) => {
      const n = new Set(prev);
      n.has(sym) ? n.delete(sym) : n.add(sym);
      return n;
    });

  const Page = () => {
    if (activeBottom === "portfolio")
      return <section className="hfv-card hfv-section p-4"><h2 className="hfv-title mb-2">Portfolio</h2><div className="hfv-subtle">Connect wallet or add coins to track PnL here (no history stored).</div></section>;
    if (activeBottom === "search")
      return <section className="hfv-card hfv-section p-4"><h2 className="hfv-title mb-2">Search</h2><div className="hfv-subtle">Use the top search bar. Advanced filters can go here.</div></section>;
    if (activeBottom === "explore")
      return <section className="hfv-card hfv-section p-4"><h2 className="hfv-title mb-2">Explore</h2><div className="hfv-subtle">Trending & discovery (latest only).</div></section>;
    if (activeBottom === "profile")
      return <section className="hfv-card hfv-section p-4"><h2 className="hfv-title mb-2">Profile</h2><div className="hfv-subtle">Settings & API keys.</div></section>;

    // Market view with top tabs
    return (
      <>
        <div className="flex items-center gap-3 mb-4">
          <label className="hfv-subtle">Currency</label>
          <select value={vs} onChange={(e) => setVs(e.target.value)} className="hfv-select">
            <option value="usd">USD</option>
            <option value="gbp">GBP</option>
            <option value="eur">EUR</option>
          </select>
        </div>

        <GlobalStats convert={vs} />

        {activeTop === "crypto" && (
          <CryptoTab vs={vs} query={query} favs={favs} onToggleFav={toggleFav} onSelectCoin={setSelected} />
        )}
        {activeTop === "categories" && <CategoriesTab />}
        {activeTop === "nft" && <NFTTab />}
        {activeTop === "exchanges" && <ExchangesTab />}

        {selected && <CoinDetail coin={selected} vs={vs} onClose={() => setSelected(null)} />}

        <footer className="text-center hfv-subtle mt-8 mb-24">Latest values only • No history stored • HFV green</footer>
      </>
    );
  };

  return (
    <div className="min-h-[100dvh] hfv-bg-radial">
      <TopBar activeTop={activeTop} setActiveTop={setActiveTop} query={query} setQuery={setQuery} />
      <main className="max-w-6xl mx-auto px-4 py-6 hfv-content-pad">
        <Page />
      </main>
      <BottomNav activeBottom={activeBottom} setActiveBottom={setActiveBottom} />
    </div>
  );
}