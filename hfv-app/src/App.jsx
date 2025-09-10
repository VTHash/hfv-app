import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Star, StarOff, TrendingUp, TrendingDown,
  Bookmark, Compass, User, Grid, Image as ImageIcon,
  Building2, BarChart2, RefreshCw, Info
} from "lucide-react";

/**
 * HFV Crypto Dashboard — LATEST ONLY (No History Stored)
 * - Markets table: /v1/cryptocurrency/listings/latest
 * - Coin info: /v2/cryptocurrency/info (logo/links)
 * - Coin quotes: /v2/cryptocurrency/quotes/latest (price/%)
 * - Global stats: /v1/global-metrics/quotes/latest
 * - Exchanges: /v1/exchange/listings/latest
 * - NFT: placeholder (free plan may not include NFT API)
 *
 * Add your CMC key in .env:
 * VITE_CMC_API_KEY=YOUR_KEY
 */

const HFV_GREEN = "#00ff88";
const CMC_BASE = "https://pro-api.coinmarketcap.com";
const CMC_KEY = import.meta.env.VITE_CMC_API_KEY;

// Tiny fetch helper (latest-only)
async function cmc(path, params = {}) {
  const url = new URL(`${CMC_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { "X-CMC_PRO_API_KEY": CMC_KEY } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/* ============== Small UI helpers ============== */
const Pill = ({ children }) => (
  <span className="px-2 py-1 rounded-full text-xs border border-emerald-500/40 bg-emerald-500/10">
    {children}
  </span>
);
const NumberText = ({ children, className = "" }) => (
  <span className={`font-mono tabular-nums ${className}`}>{children}</span>
);

/* ============== Global Stats ============== */
function GlobalStats({ convert }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let on = true;
    cmc("/v1/global-metrics/quotes/latest", { convert: (convert || "USD").toUpperCase() })
      .then((j) => on && setStats(j.data))
      .catch((e) => on && setError(e));
    return () => { on = false; };
  }, [convert]);

  const q = stats?.quote?.[convert.toUpperCase()];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <StatCard label="Global Market Cap" value={q ? `$${Math.round(q.total_market_cap).toLocaleString()}` : "—"} />
      <StatCard label="24h Volume" value={q ? `$${Math.round(q.total_volume_24h).toLocaleString()}` : "—"} />
      <StatCard label="BTC Dominance" value={stats ? `${stats.btc_dominance?.toFixed(2)}%` : "—"} />
      <StatCard label="ETH Dominance" value={stats ? `${stats.eth_dominance?.toFixed(2)}%` : "—"} />
      {error && <div className="col-span-full text-sm text-red-400">{String(error.message)}</div>}
    </div>
  );
}
function StatCard({ label, value }) {
 return (
 <div className="hfv-card p-4">
 <div className="text-xs opacity-70 mb-1">{label}</div>
 <div className="text-lg"><NumberText>{value}</NumberText></div>
 </div>
 );
}

/* ============== Markets (Cryptocurrency) ============== */
function CryptoTab({ vs, query, favs, onToggleFav, onSelectCoin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      const j = await cmc("/v1/cryptocurrency/listings/latest", {
        start: 1, limit: 100, convert: vs.toUpperCase(),
      });
      const mapped = (j.data || []).map((x) => ({
        id: x.id,
        name: x.name,
        symbol: x.symbol,
        price: x.quote[vs.toUpperCase()].price,
        change24h: x.quote[vs.toUpperCase()].percent_change_24h,
        marketcap: x.quote[vs.toUpperCase()].market_cap,
        image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${x.id}.png`,
      }));
      setItems(mapped);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [vs]);

  // Soft auto-refresh every 90s (still latest-only; no storage)
  useEffect(() => {
    const t = setInterval(fetchList, 90_000);
    return () => clearInterval(t);
  }, [vs]);

  const filtered = useMemo(() => {
    const list = items || [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((c) => (c.name + " " + c.symbol).toLowerCase().includes(q));
  }, [items, query]);

  return (
    <section className="hfv-card">
      <div className="p-4 border-b border-emerald-500/20 flex items-center gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="w-5 h-5" /> Cryptocurrency
        </h2>
        <Pill>Live</Pill>
        <button
          onClick={fetchList}
          className="ml-auto px-2 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wide text-emerald-200/70 px-4 py-2">
        <div className="col-span-6">Coin</div>
        <div className="col-span-3 text-right">Price</div>
        <div className="col-span-3 text-right">24h</div>
      </div>

      <div className="divide-y divide-emerald-500/10">
        {loading && <div className="p-4 text-sm opacity-70">Loading markets…</div>}
        {error && <div className="p-4 text-sm text-red-400">{String(error.message)}</div>}

        {!loading && !error && filtered.map((c) => {
          const up = (c.change24h ?? 0) >= 0;
          return (
            <button
              key={c.id + c.symbol}
              className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-emerald-500/5 w-full text-left"
              onClick={() => onSelectCoin(c)}
            >
              <div className="col-span-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFav(c.symbol); }}
                  className="p-1 rounded hover:bg-emerald-500/10"
                >
                  {favs.has(c.symbol) ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4 opacity-60" />}
                </button>

                {/* Icon */}
                {c.image ? (
                  <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg" style={{ background: HFV_GREEN }} />
                )}

                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs opacity-70">{c.symbol}</div>
                </div>
              </div>

              <div className="col-span-3 text-right">
                <NumberText>${c.price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</NumberText>
              </div>

              <div className={`col-span-3 text-right ${up ? "text-emerald-400" : "text-red-400"}`}>
                <span className="inline-flex items-center gap-1 justify-end">
                  {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <NumberText>{(c.change24h ?? 0).toFixed(2)}%</NumberText>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============== Coin Detail (latest only) ============== */
function CoinDetail({ coin, vs, onClose }) {
  const [info, setInfo] = useState(null);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let on = true;
    setError(null);
    Promise.all([
      cmc("/v2/cryptocurrency/info", { symbol: coin.symbol }),
      cmc("/v2/cryptocurrency/quotes/latest", { symbol: coin.symbol, convert: vs.toUpperCase() }),
    ])
      .then(([i, q]) => {
        if (!on) return;
        setInfo(i.data?.[coin.symbol]?.[0] ?? null);
        setQuote(q.data?.[coin.symbol]?.[0] ?? null);
      })
      .catch((e) => on && setError(e));
    return () => { on = false; };
  }, [coin.symbol, vs]);

  const price = quote?.quote?.[vs.toUpperCase()]?.price;
  const change24h = quote?.quote?.[vs.toUpperCase()]?.percent_change_24h;

  return (
    <section className="mt-6 hfv-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {info?.logo
            ? <img src={info.logo} alt={coin.symbol} className="w-8 h-8 rounded" />
            : <div className="w-8 h-8 rounded" style={{ background: HFV_GREEN }} />}
          <h3 className="text-lg font-semibold">
            {coin.name} <span className="text-sm opacity-70">({coin.symbol})</span>
          </h3>
        </div>
        <button onClick={onClose} className="text-sm opacity-80 hover:opacity-100">Close</button>
      </div>

      {error && <div className="text-sm text-red-400 mb-2">{String(error.message)}</div>}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="hfv-card p-3">
          <div className="text-xs opacity-70 mb-1">Price</div>
          <div className="text-lg"><NumberText>{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : "—"}</NumberText></div>
        </div>
        <div className="hfv-card p-3">
          <div className="text-xs opacity-70 mb-1">24h Change</div>
          <div className={typeof change24h === "number" && change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
            <NumberText>{typeof change24h === "number" ? `${change24h.toFixed(2)}%` : "—"}</NumberText>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 p-3 bg-black/30">
          <div className="text-xs opacity-70 mb-1">Market Cap</div>
          <div className="text-lg">
            <NumberText>
              {quote?.quote?.[vs.toUpperCase()]?.market_cap
                ? `$${quote.quote[vs.toUpperCase()].market_cap.toLocaleString()}`
                : "—"}
            </NumberText>
          </div>
        </div>
      </div>

      {info?.urls?.website?.length ? (
        <a
          href={info.urls.website[0]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200 mt-3"
        >
          <Info className="w-4 h-4" /> Official Site
        </a>
      ) : null}

      <div className="text-xs opacity-60 mt-3">Showing latest values only • No data stored</div>
    </section>
  );
}

/* ============== Placeholder tabs (latest-only approach) ============== */
function CategoriesTab() {
  return (
    <section className="hfv-card p-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <Grid className="w-5 h-5" /> Categories
      </h2>
      <div className="text-sm opacity-70">
        Hook to a categories endpoint later (latest snapshot only).
      </div>
    </section>
  );
}
function NFTTab() {
  return (
    <section className="hfv-card p-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5" /> NFT
      </h2>
      <div className="text-sm opacity-70">
        Free CMC plan may not include NFT endpoints. If available, fetch on demand only (no storage).
      </div>
    </section>
  );
}
function ExchangesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    cmc("/v1/exchange/listings/latest", { start: 1, limit: 200 })
      .then((j) => on && setItems(j.data || []))
      .catch((e) => on && setError(e))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, []);
  return (
    <section className="hfv-card p-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5" /> Exchanges
      </h2>
      {loading && <div className="text-sm opacity-70">Loading exchanges…</div>}
      {error && <div className="text-sm text-red-400">{String(error.message)}</div>}
      {!loading && !error && (
        <div className="space-y-2">
          {items.map((ex) => (
            <div key={ex.id} className="hfv-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://s2.coinmarketcap.com/static/img/exchanges/64x64/${ex.id}.png`}
                  className="w-8 h-8 rounded"
                  alt={ex.name}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div>
                  <div className="font-medium">{ex.name}</div>
                  <div className="text-xs opacity-70">Markets: {ex.num_market_pairs}</div>
                </div>
              </div>
              <div className="text-xs">
                24h Vol: <NumberText>${ex?.quote?.USD?.volume_24h?.toLocaleString?.() || "—"}</NumberText>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============== Navigation bars ============== */
function TopBar({ activeTop, setActiveTop, query, setQuery }) {
  const tabs = [
    { key: "crypto", label: "Cryptocurrency" },
    { key: "categories", label: "Categories" },
    { key: "nft", label: "NFT" },
    { key: "exchanges", label: "Exchanges" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-emerald-500/20 bg-black/30">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl shadow-[0_0_30px]" style={{ background: HFV_GREEN }} />
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: HFV_GREEN }}>HFV</h1>
          </motion.div>
          <div className="ml-auto flex items-center gap-3 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, id, or symbol..."
                className="w-full bg-black/50 border border-emerald-500/30 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <Pill>Latest Only</Pill>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTop(t.key)}
              className={`px-3 py-2 rounded-xl border ${activeTop === t.key ? "border-emerald-400 bg-emerald-500/10" : "border-emerald-500/20 bg-black/30"} text-sm whitespace-nowrap`}
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
    <nav className="sticky bottom-0 z-40 border-t border-emerald-500/20 bg-black/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-2 py-2 grid grid-cols-5 gap-1">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveBottom(key)}
            className={`flex flex-col items-center gap-1 py-2 rounded-xl ${activeBottom === key ? "bg-emerald-500/10 text-emerald-300" : "text-emerald-200/80 hover:bg-emerald-500/5"}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px]">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ============== Root App ============== */
export default function App() {
  const [activeTop, setActiveTop] = useState("crypto");
  const [activeBottom, setActiveBottom] = useState("market");

  const [vs, setVs] = useState("usd");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [favs, setFavs] = useState(() => new Set(["HFV"]));

  const toggleFav = (sym) => setFavs((prev) => {
    const n = new Set(prev); n.has(sym) ? n.delete(sym) : n.add(sym); return n;
  });

  const Page = () => {
    if (activeBottom === "portfolio")
      return <Section title="Portfolio">Connect wallet or add coins to track (no history stored).</Section>;
    if (activeBottom === "search")
      return <Section title="Search">Use the top search bar. Filters can go here.</Section>;
    if (activeBottom === "explore")
      return <Section title="Explore">Trending & discovery (latest only).</Section>;
    if (activeBottom === "profile")
      return <Section title="Profile">Settings</Section>;

    // market view
    return (
      <>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm opacity-80">Currency</label>
          <select
            value={vs}
            onChange={(e) => setVs(e.target.value)}
            className="bg-black/60 border border-emerald-500/30 rounded-lg text-sm p-1.5"
          >
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

        <footer className="text-center text-xs opacity-70 mt-8 mb-24">
          Latest values only • No history stored • HFV green
        </footer>
      </>
    );
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: `radial-gradient(1200px 800px at 50% -10%, ${HFV_GREEN}10, #0a0f0c 60%)`,
        backgroundColor: "#0a0f0c",
      }}
    >
      <TopBar activeTop={activeTop} setActiveTop={setActiveTop} query={query} setQuery={setQuery} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Page />
      </main>
      <BottomNav activeBottom={activeBottom} setActiveBottom={setActiveBottom} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="hfv-card p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="text-sm opacity-80">{children}</div>
    </section>
  );
}