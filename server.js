const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

/* =========================
   CACHE SYSTEM v9
========================= */
let cache = {};
const TTL = 20 * 1000;

function setCache(k, v) {
    cache[k] = { v, t: Date.now() };
}

function getCache(k) {
    if (cache[k] && Date.now() - cache[k].t < TTL) return cache[k].v;
    return null;
}

/* =========================
   FETCHERS
========================= */
async function getBTC() {
    const c = getCache("btc");
    if (c) return c;

    try {
        const res = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        );
        const v = res.data.bitcoin.usd;
        setCache("btc", v);
        return v;
    } catch {
        return 60000;
    }
}

async function getGold() {
    const c = getCache("gold");
    if (c) return c;

    try {
        const res = await axios.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"
        );

        let v = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (!v || v < 1500 || v > 3500) throw new Error();

        setCache("gold", v);
        return v;
    } catch {
        const fallback = 2350;
        setCache("gold", fallback);
        return fallback;
    }
}

async function getDXY() {
    const c = getCache("dxy");
    if (c) return c;

    try {
        const res = await axios.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB"
        );

        let v = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (!v || v < 90 || v > 120) throw new Error();

        setCache("dxy", v);
        return v;
    } catch {
        const fallback = 103;
        setCache("dxy", fallback);
        return fallback;
    }
}

/* =========================
   NEWS SENTIMENT v9 (AI READY)
========================= */
async function getNewsSentiment() {
    const c = getCache("news");
    if (c !== undefined) return c;

    try {
        // 👉 اینجا بعداً AI / News API وصل می‌کنی
        // مثال:
        // const res = await axios.get("YOUR_AI_NEWS_ENDPOINT");
        // return res.data.sentiment;

        const sentiment = 0; // -1 bearish | 0 neutral | +1 bullish

        setCache("news", sentiment);
        return sentiment;
    } catch {
        return 0;
    }
}

/* =========================
   CORRELATION MATRIX (simplified)
========================= */
function correlationMatrix(btc, gold, dxy) {

    const matrix = {
        btc_gold: btc > 65000 && gold > 2300 ? 0.6 : -0.2,
        btc_dxy: btc > 65000 && dxy < 100 ? 0.7 : -0.3,
        gold_dxy: gold > 2400 && dxy > 104 ? 0.5 : -0.4
    };

    const avg =
        (matrix.btc_gold + matrix.btc_dxy + matrix.gold_dxy) / 3;

    return {
        matrix,
        score: avg
    };
}

/* =========================
   ADAPTIVE WEIGHTS ENGINE
========================= */
function adaptiveWeights(volatility) {

    // market becomes defensive when volatility is high
    if (volatility > 70) {
        return {
            momentum: 0.3,
            liquidity: 0.4,
            sentiment: 0.2,
            correlation: 0.1
        };
    }

    // normal market
    return {
        momentum: 0.4,
        liquidity: 0.2,
        sentiment: 0.2,
        correlation: 0.2
    };
}

/* =========================
   BASIC METRICS
========================= */
function volatility(btc, gold, dxy) {
    return Math.min(100,
        (Math.abs(btc - 60000) / 600) +
        (Math.abs(gold - 2300) / 25) +
        (Math.abs(dxy - 103) * 2)
    );
}

function liquidity(dxy, btc) {
    let l = 50;
    if (dxy < 100) l += 20;
    if (dxy > 105) l -= 20;
    if (btc > 65000) l += 10;
    if (btc < 55000) l -= 10;
    return Math.max(0, Math.min(100, l));
}

function momentum(btc, gold, dxy) {
    let m = 50;
    if (btc > 65000) m += 20;
    if (gold > 2400) m -= 10;
    if (dxy < 100) m += 10;
    return Math.max(0, Math.min(100, m));
}

/* =========================
   MARKET BRAIN v9 CORE
========================= */
function marketBrain({ btc, gold, dxy, news }) {

    const vol = volatility(btc, gold, dxy);
    const liq = liquidity(dxy, btc);
    const mom = momentum(btc, gold, dxy);

    const corr = correlationMatrix(btc, gold, dxy);

    const weights = adaptiveWeights(vol);

    let score =
        mom * weights.momentum +
        liq * weights.liquidity +
        news * 50 * weights.sentiment +
        corr.score * 50 * weights.correlation -
        vol * 0.15;

    score = Math.max(0, Math.min(100, score));

    let state = "NEUTRAL";

    if (vol > 75) state = "CRISIS MODE ⚠️";
    else if (score > 70) state = "TREND RISK ON 🔥";
    else if (score < 40) state = "RISK OFF 📉";
    else state = "RANGE MARKET ↔️";

    return {
        score: Math.round(score),
        state,
        volatility: Math.round(vol),
        liquidity: Math.round(liq),
        momentum: Math.round(mom),
        correlationScore: corr.score,
        weights
    };
}

/* =========================
   SIGNAL ENGINE
========================= */
function signal(score, volatility) {
    if (score > 72 && volatility < 60) return "STRONG BUY 🟢";
    if (score < 38 || volatility > 75) return "STRONG SELL 🔴";
    return "NEUTRAL / WAIT 🟡";
}

/* =========================
   API
========================= */
app.get("/finscope", async (req, res) => {
    try {

        const [btc, gold, dxy, news] = await Promise.all([
            getBTC(),
            getGold(),
            getDXY(),
            getNewsSentiment()
        ]);

        const brain = marketBrain({ btc, gold, dxy, news });

        res.json({
            version: "v9",
            btc,
            gold,
            dxy,

            newsSentiment: news,

            score: brain.score,
            state: brain.state,

            volatility: brain.volatility,
            liquidity: brain.liquidity,
            momentum: brain.momentum,

            correlationScore: brain.correlationScore,

            weights: brain.weights,

            signal: signal(brain.score, brain.volatility),

            timestamp: new Date().toISOString()
        });

    } catch (err) {
        res.status(500).json({
            error: "FinScope v9 error",
            message: err.message
        });
    }
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 FinScope v9 AI Brain running on port", PORT);
});