const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

/* =========================
   BITCOIN
========================= */
async function getBTC() {
    const res = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    return res.data.bitcoin.usd;
}

/* =========================
   GOLD (REAL MARKET)
========================= */
async function getGold() {
    try {
        const res = await axios.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"
        );
        return res.data.chart.result[0].meta.regularMarketPrice;
    } catch (e) {
        return 2000;
    }
}

/* =========================
   DXY (Dollar Index Proxy)
========================= */
async function getDXY() {
    try {
        const res = await axios.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB"
        );
        return res.data.chart.result[0].meta.regularMarketPrice;
    } catch (e) {
        return 103;
    }
}

/* =========================
   MAIN ENDPOINT
========================= */
app.get("/finscope", async (req, res) => {
    try {

        const btc = await getBTC();
        const gold = await getGold();
        const dxy = await getDXY();

        let score = 50;

        // BTC logic
        if (btc > 65000) score += 20;
        if (btc < 50000) score -= 20;

        // Gold logic
        if (gold > 2100) score -= 10;

        // DXY logic
        if (dxy > 104) score -= 10;

        score = Math.max(0, Math.min(100, score));

        let signal = "WAIT 🟡";
        if (score >= 70) signal = "BUY 🟢";
        if (score <= 40) signal = "SELL 🔴";

        res.json({
            btc,
            gold,
            dxy,
            score,
            signal,
            mood:
                score > 70 ? "RISK ON" :
                    score < 40 ? "RISK OFF" : "NEUTRAL"
        });

    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 FinScope running on Render");
});
