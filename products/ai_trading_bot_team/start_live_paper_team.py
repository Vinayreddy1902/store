#!/usr/bin/env python3
"""
6 AI Bot Trading Team — Live Paper Mode Autonomous Desk
Integrated with:
1. Real-time Binance Public Ticker Feeds (DOGE, PEPE, SHIB, BONK, FLOKI)
2. Real-time Polymarket Prediction Market Feeds (Agent 4)
3. Automated Position Lifecycle Monitor (auto Take-Profit & Stop-Loss triggers)
4. Immutable CSV & JSON Ledger Logging
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

# Add local path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trading_team import (
    TradingTeamDesk, 
    TokenMarketData, 
    PredictionMarketData, 
    LEDGER_CSV, 
    LEDGER_JSON
)

LIVE_SYMBOLS = [
    {"sym": "DOGEUSDT", "token": "DOGE"},
    {"sym": "PEPEUSDT", "token": "PEPE"},
    {"sym": "SHIBUSDT", "token": "SHIB"},
    {"sym": "BONKUSDT", "token": "BONK"},
    {"sym": "FLOKIUSDT", "token": "FLOKI"}
]

def fetch_live_binance_data():
    """Fetches real-time 24hr ticker data from Binance public API."""
    sym_list = '["' + '","'.join([s["sym"] for s in LIVE_SYMBOLS]) + '"]'
    url = f"https://api.binance.com/api/v3/ticker/24hr?symbols={urllib.parse.quote(sym_list)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            return {item["symbol"]: item for item in data}
    except Exception as e:
        print(f"[!] Warning: Live ticker fetch error: {e}")
        return {}

def fetch_live_polymarket_events():
    """Fetches real-time prediction market events from Polymarket Gamma API."""
    url = "https://gamma-api.polymarket.com/events?closed=false&limit=6"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            events = json.loads(resp.read().decode())
            return events
    except Exception as e:
        print(f"[!] Warning: Polymarket fetch error: {e}")
        return []

def monitor_active_position(desk: TradingTeamDesk, live_tickers: dict):
    """Monitors any open paper trade and triggers simulated TP/SL resolution."""
    if not desk.active_position:
        return

    pos = desk.active_position
    token = pos["token"]
    sym = f"{token}USDT"
    raw = live_tickers.get(sym)
    if not raw:
        return

    current_price = float(raw["lastPrice"])
    target = pos["target"]
    stop = pos["stop_loss"]

    print(f"\n🔍 [MONITORING ACTIVE PAPER TRADE: ${token}]")
    print(f"   Entry: ${pos['entry_price']:.6f} | Current: ${current_price:.6f}")
    print(f"   Stop:  ${stop:.6f} | Target: ${target:.6f}")

    if current_price >= target:
        print(f"🎯 [TARGET REACHED] ${token} reached ${target:.6f}!")
        desk.simulate_resolution("WIN")
    elif current_price <= stop:
        print(f"🛑 [STOP LOSS HIT] ${token} touched ${stop:.6f}!")
        desk.simulate_resolution("LOSS")
    else:
        unrealized_pct = ((current_price - pos["entry_price"]) / pos["entry_price"]) * 100
        unrealized_usd = pos["position_size_usd"] * (unrealized_pct / 100.0)
        print(f"   Status: Holding | Floating P&L: ${unrealized_usd:+.2f} ({unrealized_pct:+.2f}%)")

def run_live_desk_cycle(desk: TradingTeamDesk):
    print("\n" + "#"*70)
    print(f"⚡ [6-AGENT TRADING DESK] Live Autonomous Paper Cycle — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"💰 Account Equity: ${desk.paper_balance:,.2f} | Max 1% Risk: ${desk.paper_balance * 0.01:,.2f}")
    print("#"*70)

    live_tickers = fetch_live_binance_data()
    
    # Check if existing position hit target or stop
    monitor_active_position(desk, live_tickers)

    for s_info in LIVE_SYMBOLS:
        sym = s_info["sym"]
        token = s_info["token"]
        raw = live_tickers.get(sym)

        if raw:
            last_price = float(raw["lastPrice"])
            chg_24h = float(raw["priceChangePercent"])
            low_24h = float(raw["lowPrice"])
            high_24h = float(raw["highPrice"])
            vol_usd = float(raw["quoteVolume"])
            
            # Short-term momentum estimation
            approx_5m = round(chg_24h * 0.05, 2)
            approx_15m = round(chg_24h * 0.15, 2)
            
            # Structural levels: support below current price, resistance above
            support_level = min(low_24h, last_price * 0.965)
            resistance_level = max(high_24h, last_price * 1.08)
            
            is_green_candle = chg_24h > 15.0 or approx_5m > 6.0
            orderly = (high_24h > low_24h) and (vol_usd > 1_000_000)
            
            market_data = TokenMarketData(
                token=token,
                price=last_price,
                support=support_level,
                resistance=resistance_level,
                pct_move_5m=approx_5m,
                pct_move_15m=approx_15m,
                pct_move_24h=chg_24h,
                volume_24h_usd=vol_usd,
                liquidity_usd=vol_usd * 0.15,
                orderly_structure=orderly,
                recent_large_green_candle=is_green_candle
            )
        else:
            market_data = TokenMarketData(
                token=token,
                price=0.045,
                support=0.042,
                resistance=0.054,
                pct_move_5m=1.2,
                pct_move_15m=3.4,
                pct_move_24h=8.5,
                volume_24h_usd=15_000_000,
                liquidity_usd=2_500_000,
                orderly_structure=True,
                recent_large_green_candle=False
            )

        # Run 6-agent evaluation
        desk.evaluate_token(market_data)
        time.sleep(0.5)

    # Agent 4: Live Polymarket scan
    print("\n" + "-"*70)
    print("🔮 [AGENT 4: LIVE POLYMARKET RESEARCH SCAN]")
    print("-"*70)
    poly_events = fetch_live_polymarket_events()
    if poly_events:
        for ev in poly_events[:2]:
            title = ev.get("title", "Market")
            vol = float(ev.get("volume", 0))
            markets = ev.get("markets", [])
            prob = 0.50
            if markets and markets[0].get("outcomePrices"):
                try:
                    prices = json.loads(markets[0]["outcomePrices"])
                    prob = float(prices[0])
                except:
                    prob = 0.50

            pm_event = PredictionMarketData(
                market=title,
                current_implied_prob=prob,
                event_description=ev.get("description", "Prediction contract"),
                evidence_summary=f"Polymarket aggregate contract with ${vol:,.0f} 24h trading volume.",
                arguments_yes=["Historical trend favors resolution", "High market participant volume"],
                arguments_no=["Unresolved timing constraints"],
                uncertainty_level="LOW" if vol > 500_000 else "MEDIUM"
            )
            desk.evaluate_prediction_market(pm_event)
    else:
        print("[!] No live prediction events retrieved, skipping prediction scan.")

    # Summary performance audit
    print("\n" + "="*70)
    print("📋 [OFFICIAL DESK AUDIT — AGENT #6 LOGGER]")
    print("="*70)
    stats = desk.logger.compute_stats()
    for k, v in stats.items():
        print(f"  {k.replace('_', ' ').title():<26}: {v}")
    print(f"  CSV Ledger: {LEDGER_CSV}")
    print(f"  Web Simulator: http://localhost:3000/products/ai_trading_bot_team/trading_desk.html")
    print("="*70 + "\n")

if __name__ == "__main__":
    desk = TradingTeamDesk(paper_balance=1050.0)
    
    if "--loop" in sys.argv:
        print("[*] Starting Continuous Paper Trading Loop (60s polling)...")
        while True:
            try:
                run_live_desk_cycle(desk)
                print("[*] Sleeping 60 seconds until next live scan... (Press Ctrl+C to stop)")
                time.sleep(60)
            except KeyboardInterrupt:
                print("\n[!] Desk gracefully paused by operator.")
                break
    else:
        run_live_desk_cycle(desk)
