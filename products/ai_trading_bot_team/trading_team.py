#!/usr/bin/env python3
"""
6 AI Bot Trading Team Engine (Paper Mode Only)
Implements all 6 specialized trading desk agents:
1. Scanner: Evaluates technical setup & liquidity
2. Anti-FOMO: Detects parabolic pumps, extended candles & blocks bad entries
3. Sizer: Calculates exact 1% portfolio risk & position allocation
4. Buyer: Produces paper execution ticket only upon unanimous consensus
5. Prediction-Market Agent: Evaluates probabilistic event research
6. Logger: Records ledger to CSV and generates performance analytics
"""

import os
import sys
import json
import csv
import time
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEDGER_CSV = os.path.join(BASE_DIR, "paper_trades_ledger.csv")
LEDGER_JSON = os.path.join(BASE_DIR, "paper_trades_ledger.json")

# =====================================================================
# DATA CLASSES
# =====================================================================

@dataclass
class TokenMarketData:
    token: str
    price: float
    support: float
    resistance: float
    pct_move_5m: float
    pct_move_15m: float
    pct_move_24h: float
    volume_24h_usd: float
    liquidity_usd: float
    orderly_structure: bool
    recent_large_green_candle: bool

@dataclass
class PredictionMarketData:
    market: str
    current_implied_prob: float
    event_description: str
    evidence_summary: str
    arguments_yes: List[str]
    arguments_no: List[str]
    uncertainty_level: str  # LOW, MEDIUM, HIGH

# =====================================================================
# AGENT 1: SCANNER
# =====================================================================
class ScannerAgent:
    """Agent 1: Evaluates market structure and flags candidate setups."""
    
    def evaluate(self, data: TokenMarketData) -> Dict[str, Any]:
        # Minimum liquidity requirement for paper meme-coins ($100k)
        if data.liquidity_usd < 100_000:
            return {
                "decision": "SKIP",
                "setup": "Illiquid",
                "reason": f"Liquidity (${data.liquidity_usd:,.0f}) is below the $100,000 threshold.",
                "entry_area": None,
                "invalidation": None
            }
        
        # Check if price action has clean support/resistance
        if not data.orderly_structure:
            return {
                "decision": "SKIP",
                "setup": "Erratic Structure",
                "reason": "Price action is disordered with no recognizable technical pattern.",
                "entry_area": None,
                "invalidation": None
            }
            
        # Ensure invalidation is strictly below entry price by at least 2.5% to 3.5%
        invalidation = min(data.support * 0.985, data.price * 0.965)
        # Target: ensure at least 2.0x risk multiple if resistance is too close
        risk_dist = data.price - invalidation
        min_target = data.price + (risk_dist * 2.1)
        target = max(data.resistance, min_target)
        
        return {
            "decision": "PASS",
            "setup": "Support Bounce / Range Reversion",
            "entry_area": data.price,
            "invalidation": round(invalidation, 9),
            "target": round(target, 9),
            "reason": f"Token consolidating above ${data.support:.8f} support with 24h volume of ${data.volume_24h_usd:,.0f}."
        }

# =====================================================================
# AGENT 5: ANTI-FOMO
# =====================================================================
class AntiFOMOAgent:
    """Agent 5: Blocks entries caused by chasing vertical pumps."""
    
    def evaluate(self, data: TokenMarketData, proposed_entry: float) -> Dict[str, Any]:
        # Trigger 1: Massive 5m or 15m pump
        if data.pct_move_5m > 8.0:
            return {
                "decision": "BLOCK",
                "reason": f"Price is up +{data.pct_move_5m:.1f}% in the last 5 minutes. Chasing violent impulses violates anti-FOMO rules."
            }
            
        if data.pct_move_15m > 18.0:
            return {
                "decision": "BLOCK",
                "reason": f"Price extended +{data.pct_move_15m:.1f}% over 15 minutes. Wait for an orderly pullback and retest."
            }
            
        # Trigger 2: Entry immediately following a giant green candle
        if data.recent_large_green_candle:
            return {
                "decision": "BLOCK",
                "reason": "Entry directly at the top of a giant green candle. High statistical probability of mean-reversion wick."
            }
            
        # Trigger 3: Price extended far above support (>12%)
        dist_from_support = ((proposed_entry - data.support) / data.support) * 100
        if dist_from_support > 12.0:
            return {
                "decision": "BLOCK",
                "reason": f"Price is {dist_from_support:.1f}% above base support. Risk cannot be tightly defined."
            }
            
        return {
            "decision": "APPROVE",
            "reason": "Price is not parabolic. Consolidation pattern provides clean invalidation level."
        }

# =====================================================================
# AGENT 2: SIZER
# =====================================================================
class SizerAgent:
    """Agent 2: Strictly sizes positions so maximum risk is 1.0% of portfolio equity."""
    
    def evaluate(self, account_equity: float, entry: float, stop_loss: float, target: float) -> Dict[str, Any]:
        if entry <= stop_loss:
            return {
                "decision": "REJECT",
                "reason": "Invalid parameters: Stop-loss must be strictly below entry price for long setups."
            }
            
        risk_per_unit = entry - stop_loss
        pct_risk_distance = (risk_per_unit / entry) * 100
        
        # Invalidation must be reasonable (between 2% and 15%)
        if pct_risk_distance > 15.0:
            return {
                "decision": "REJECT",
                "reason": f"Stop loss distance ({pct_risk_distance:.1f}%) is too wide. Capital efficiency compromised."
            }
            
        if pct_risk_distance < 1.5:
            return {
                "decision": "REJECT",
                "reason": f"Stop loss distance ({pct_risk_distance:.1f}%) is tighter than market noise spread."
            }
            
        # Max portfolio risk = exactly 1.0%
        max_dollars_at_risk = account_equity * 0.01
        
        # Position sizing: Total position ($) = Max Risk ($) / Risk Fraction
        simulated_position_usd = max_dollars_at_risk / (pct_risk_distance / 100.0)
        
        # Cap position size to 25% of account balance to prevent over-concentration
        if simulated_position_usd > (account_equity * 0.25):
            simulated_position_usd = account_equity * 0.25
            max_dollars_at_risk = simulated_position_usd * (pct_risk_distance / 100.0)
            
        units = simulated_position_usd / entry
        potential_gain_per_unit = target - entry
        rr_ratio = potential_gain_per_unit / risk_per_unit
        
        # Minimum Risk/Reward must be at least 1:1.8
        if rr_ratio < 1.8:
            return {
                "decision": "REJECT",
                "reason": f"Risk/Reward ratio (1:{rr_ratio:.2f}) is below the required 1:1.8 minimum."
            }
            
        return {
            "decision": "APPROVE",
            "max_dollar_risk": round(max_dollars_at_risk, 2),
            "position_size_usd": round(simulated_position_usd, 2),
            "units": round(units, 4),
            "risk_pct_distance": round(pct_risk_distance, 2),
            "risk_reward_ratio": round(rr_ratio, 2),
            "reason": f"Risking ${max_dollars_at_risk:.2f} (1.0%) to make ${simulated_position_usd * (potential_gain_per_unit/entry):.2f} (1:{rr_ratio:.2f} R:R)."
        }

# =====================================================================
# AGENT 3: BUYER (SIMULATED EXECUTION TICKET)
# =====================================================================
class BuyerAgent:
    """Agent 3: Creates simulated paper trade tickets ONLY when consensus is unanimous."""
    
    def evaluate(self, 
                 token: str, 
                 scanner_res: Dict[str, Any], 
                 anti_fomo_res: Dict[str, Any], 
                 sizer_res: Dict[str, Any], 
                 active_positions_count: int) -> Dict[str, Any]:
        
        # Inviolable Rule: Maximum one position at a time
        if active_positions_count >= 1:
            return {
                "status": "TRADE BLOCKED",
                "reason": "Single Position Rule: An active paper position is already open."
            }
            
        if scanner_res.get("decision") != "PASS":
            return {
                "status": "TRADE BLOCKED",
                "reason": f"Scanner rejected setup: {scanner_res.get('reason')}"
            }
            
        if anti_fomo_res.get("decision") != "APPROVE":
            return {
                "status": "TRADE BLOCKED",
                "reason": f"Anti-FOMO blocked trade: {anti_fomo_res.get('reason')}"
            }
            
        if sizer_res.get("decision") != "APPROVE":
            return {
                "status": "TRADE BLOCKED",
                "reason": f"Sizer rejected trade: {sizer_res.get('reason')}"
            }
            
        ticket_id = f"PT-{int(time.time())}-{token}"
        return {
            "status": "OPEN",
            "ticket_id": ticket_id,
            "token": token,
            "entry_price": scanner_res["entry_area"],
            "stop_loss": scanner_res["invalidation"],
            "target": scanner_res["target"],
            "position_size_usd": sizer_res["position_size_usd"],
            "units": sizer_res["units"],
            "max_dollar_risk": sizer_res["max_dollar_risk"],
            "risk_reward": sizer_res["risk_reward_ratio"],
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        }

# =====================================================================
# AGENT 4: PREDICTION-MARKET AGENT
# =====================================================================
class PredictionMarketAgent:
    """Agent 4: Tracks and researches probabilistic prediction markets."""
    
    def evaluate(self, data: PredictionMarketData, paper_balance: float) -> Dict[str, Any]:
        # Model subjective probability from arguments
        yes_weight = len(data.arguments_yes)
        no_weight = len(data.arguments_no)
        
        if yes_weight + no_weight == 0:
            return {"decision": "SKIP", "reason": "Insufficient verified evidentiary data."}
            
        estimated_prob = yes_weight / (yes_weight + no_weight)
        discrepancy = estimated_prob - data.current_implied_prob
        
        # Only take trade if mispricing edge > 12% and uncertainty != HIGH
        if data.uncertainty_level == "HIGH":
            return {
                "decision": "SKIP",
                "market": data.market,
                "reason": "High foundational uncertainty. Preserving paper capital."
            }
            
        if abs(discrepancy) < 0.12:
            return {
                "decision": "SKIP",
                "market": data.market,
                "reason": f"Edge too small (Market: {data.current_implied_prob*100:.1f}%, Estimated: {estimated_prob*100:.1f}%)."
            }
            
        direction = "YES" if discrepancy > 0 else "NO"
        max_risk = round(paper_balance * 0.005, 2) # Half percent on prediction markets
        
        return {
            "decision": f"PAPER BET {direction}",
            "market": data.market,
            "current_implied": f"{data.current_implied_prob*100:.1f}%",
            "estimated_range": f"{estimated_prob*100:.1f}%",
            "edge": f"{abs(discrepancy)*100:.1f}%",
            "max_paper_risk": f"${max_risk:.2f}",
            "confidence": "MEDIUM" if data.uncertainty_level == "MEDIUM" else "HIGH",
            "reason": f"Identified {abs(discrepancy)*100:.1f}% probabilistic discrepancy against market consensus."
        }

# =====================================================================
# AGENT 6: LOGGER & LEDGER MANAGER
# =====================================================================
class LoggerAgent:
    """Agent 6: Immutable CSV/JSON ledger of all trades and blocked setups."""
    
    def __init__(self):
        self._init_csv()
        
    def _init_csv(self):
        if not os.path.exists(LEDGER_CSV):
            with open(LEDGER_CSV, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "Timestamp", "Ticket_ID", "Asset", "Status", "Entry", "Exit",
                    "Stop_Loss", "Target", "Size_USD", "Max_Risk_USD", "P_L_USD", 
                    "P_L_Pct", "Scanner_Vote", "AntiFOMO_Vote", "Sizer_Vote", "Notes"
                ])
                
    def record_trade(self, record: Dict[str, Any]):
        # Append to CSV
        with open(LEDGER_CSV, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                record.get("timestamp", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")),
                record.get("ticket_id", "N/A"),
                record.get("asset", "N/A"),
                record.get("status", "N/A"),
                record.get("entry", 0),
                record.get("exit", 0),
                record.get("stop", 0),
                record.get("target", 0),
                record.get("size_usd", 0),
                record.get("max_risk_usd", 0),
                record.get("pnl_usd", 0),
                record.get("pnl_pct", 0),
                record.get("scanner_vote", "N/A"),
                record.get("anti_fomo_vote", "N/A"),
                record.get("sizer_vote", "N/A"),
                record.get("notes", "")
            ])
            
        # Update JSON list
        all_records = self.get_all_records()
        all_records.append(record)
        with open(LEDGER_JSON, "w") as f:
            json.dump(all_records, f, indent=2)

    def get_all_records(self) -> List[Dict[str, Any]]:
        if os.path.exists(LEDGER_JSON):
            try:
                with open(LEDGER_JSON, "r") as f:
                    return json.load(f)
            except:
                return []
        return []

    def compute_stats(self) -> Dict[str, Any]:
        records = self.get_all_records()
        if not records:
            return {"total_records": 0, "closed_trades": 0, "win_rate": "0%"}
            
        closed = [r for r in records if r.get("status") in ("WIN", "LOSS")]
        blocked = [r for r in records if "BLOCKED" in r.get("status", "")]
        wins = [r for r in closed if r.get("status") == "WIN"]
        losses = [r for r in closed if r.get("status") == "LOSS"]
        
        total_pnl = sum(r.get("pnl_usd", 0) for r in closed)
        win_rate = (len(wins) / len(closed) * 100) if closed else 0.0
        
        return {
            "total_evaluations": len(records),
            "closed_trades": len(closed),
            "blocked_setups": len(blocked),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": f"{win_rate:.1f}%",
            "total_simulated_pnl": f"${total_pnl:+.2f}",
            "avg_win": f"${(sum(r.get('pnl_usd', 0) for r in wins)/len(wins)):.2f}" if wins else "$0.00",
            "avg_loss": f"${(sum(r.get('pnl_usd', 0) for r in losses)/len(losses)):.2f}" if losses else "$0.00"
        }

# =====================================================================
# MULTI-AGENT ORCHESTRATION PIPELINE
# =====================================================================
class TradingTeamDesk:
    def __init__(self, paper_balance: float = 1000.0):
        self.paper_balance = paper_balance
        self.scanner = ScannerAgent()
        self.anti_fomo = AntiFOMOAgent()
        self.sizer = SizerAgent()
        self.buyer = BuyerAgent()
        self.pm_agent = PredictionMarketAgent()
        self.logger = LoggerAgent()
        self.active_position: Optional[Dict[str, Any]] = None

    def evaluate_token(self, data: TokenMarketData) -> Dict[str, Any]:
        print(f"\n" + "="*60)
        print(f"📊 [DESK EVALUATION] Analyzing: ${data.token} @ ${data.price:.4f}")
        print("="*60)
        
        # 1. Scanner Agent
        s_res = self.scanner.evaluate(data)
        print(f"1️⃣  [SCANNER]   Decision: {s_res['decision']} | {s_res['reason']}")
        if s_res["decision"] == "SKIP":
            self.logger.record_trade({
                "asset": data.token,
                "status": "BLOCKED_BY_SCANNER",
                "scanner_vote": "SKIP",
                "anti_fomo_vote": "N/A",
                "sizer_vote": "N/A",
                "notes": s_res["reason"]
            })
            return {"result": "BLOCKED", "agent": "Scanner", "details": s_res}

        # 2. Anti-FOMO Agent
        af_res = self.anti_fomo.evaluate(data, s_res["entry_area"])
        print(f"2️⃣  [ANTI-FOMO] Decision: {af_res['decision']} | {af_res['reason']}")
        if af_res["decision"] == "BLOCK":
            self.logger.record_trade({
                "asset": data.token,
                "status": "BLOCKED_BY_ANTI_FOMO",
                "scanner_vote": "PASS",
                "anti_fomo_vote": "BLOCK",
                "sizer_vote": "N/A",
                "notes": af_res["reason"]
            })
            return {"result": "BLOCKED", "agent": "Anti-FOMO", "details": af_res}

        # 3. Sizer Agent (1% Risk Rule)
        sz_res = self.sizer.evaluate(
            account_equity=self.paper_balance,
            entry=s_res["entry_area"],
            stop_loss=s_res["invalidation"],
            target=s_res["target"]
        )
        print(f"3️⃣  [SIZER]     Decision: {sz_res['decision']} | {sz_res['reason']}")
        if sz_res["decision"] == "REJECT":
            self.logger.record_trade({
                "asset": data.token,
                "status": "BLOCKED_BY_SIZER",
                "scanner_vote": "PASS",
                "anti_fomo_vote": "APPROVE",
                "sizer_vote": "REJECT",
                "notes": sz_res["reason"]
            })
            return {"result": "BLOCKED", "agent": "Sizer", "details": sz_res}

        # 4. Buyer Agent (Simulated Execution Ticket)
        active_cnt = 1 if self.active_position else 0
        b_res = self.buyer.evaluate(
            token=data.token,
            scanner_res=s_res,
            anti_fomo_res=af_res,
            sizer_res=sz_res,
            active_positions_count=active_cnt
        )
        print(f"4️⃣  [BUYER]     Decision: {b_res['status']}")
        
        if b_res["status"] == "OPEN":
            self.active_position = b_res
            print(f"\n🎯 [PAPER TICKET GENERATED]")
            print(f"   ID:       {b_res['ticket_id']}")
            print(f"   Entry:    ${b_res['entry_price']:.4f}")
            print(f"   Size:     ${b_res['position_size_usd']:.2f} ({b_res['units']:.2f} tokens)")
            print(f"   Stop:     ${b_res['stop_loss']:.4f}")
            print(f"   Target:   ${b_res['target']:.4f}")
            print(f"   Risk $:   ${b_res['max_dollar_risk']:.2f} (1.0% Equity)")
            print(f"   R:R:      1 : {b_res['risk_reward']}")
            
            self.logger.record_trade({
                "ticket_id": b_res["ticket_id"],
                "asset": data.token,
                "status": "OPEN",
                "entry": b_res["entry_price"],
                "stop": b_res["stop_loss"],
                "target": b_res["target"],
                "size_usd": b_res["position_size_usd"],
                "max_risk_usd": b_res["max_dollar_risk"],
                "scanner_vote": "PASS",
                "anti_fomo_vote": "APPROVE",
                "sizer_vote": "APPROVE",
                "notes": "Unanimous Consensus Paper Entry"
            })
            return {"result": "OPEN", "ticket": b_res}
        else:
            return {"result": "BLOCKED", "agent": "Buyer", "details": b_res}

    def simulate_resolution(self, outcome: str):
        """Simulates closing the active paper trade at target or stop."""
        if not self.active_position:
            print("[!] No active paper trade currently open.")
            return
            
        pos = self.active_position
        if outcome == "WIN":
            gain_pct = (pos["target"] - pos["entry_price"]) / pos["entry_price"]
            pnl_usd = round(pos["position_size_usd"] * gain_pct, 2)
            self.paper_balance += pnl_usd
            print(f"\n✅ [PAPER WIN LOGGED] +${pnl_usd:.2f} (+{gain_pct*100:.1f}%) | New Balance: ${self.paper_balance:,.2f}")
            status = "WIN"
            exit_price = pos["target"]
        else:
            loss_pct = (pos["entry_price"] - pos["stop_loss"]) / pos["entry_price"]
            pnl_usd = -round(pos["max_dollar_risk"], 2)
            self.paper_balance += pnl_usd
            print(f"\n❌ [PAPER LOSS LOGGED] -${abs(pnl_usd):.2f} (-{loss_pct*100:.1f}%) | New Balance: ${self.paper_balance:,.2f}")
            status = "LOSS"
            exit_price = pos["stop_loss"]
            
        self.logger.record_trade({
            "ticket_id": pos["ticket_id"],
            "asset": pos["token"],
            "status": status,
            "entry": pos["entry_price"],
            "exit": exit_price,
            "stop": pos["stop_loss"],
            "target": pos["target"],
            "size_usd": pos["position_size_usd"],
            "max_risk_usd": pos["max_dollar_risk"],
            "pnl_usd": pnl_usd,
            "pnl_pct": round(pnl_usd / pos["position_size_usd"] * 100, 2),
            "scanner_vote": "PASS",
            "anti_fomo_vote": "APPROVE",
            "sizer_vote": "APPROVE",
            "notes": f"Paper position resolved as {status}"
        })
        self.active_position = None

    def evaluate_prediction_market(self, data: PredictionMarketData):
        print(f"\n" + "="*60)
        print(f"🔮 [PREDICTION-MARKET AGENT] Researching: {data.market}")
        print("="*60)
        res = self.pm_agent.evaluate(data, self.paper_balance)
        print(f"   Market Prob:   {res.get('current_implied', 'N/A')}")
        print(f"   Calculated:    {res.get('estimated_range', 'N/A')}")
        print(f"   Edge:          {res.get('edge', 'N/A')}")
        print(f"   Recommendation:{res.get('decision')}")
        print(f"   Max Risk:      {res.get('max_paper_risk', 'N/A')}")
        print(f"   Analysis:      {res.get('reason')}")
        return res

# =====================================================================
# DEMO EXECUTION WALKTHROUGH
# =====================================================================
def run_demonstration():
    desk = TradingTeamDesk(paper_balance=1000.0)
    
    # Setup 1: Clean support bounce on established meme token (Should PASS)
    token_1 = TokenMarketData(
        token="PEPE",
        price=0.0000095,
        support=0.0000090,
        resistance=0.0000120,
        pct_move_5m=1.2,
        pct_move_15m=3.5,
        pct_move_24h=14.0,
        volume_24h_usd=450_000_000,
        liquidity_usd=12_000_000,
        orderly_structure=True,
        recent_large_green_candle=False
    )
    desk.evaluate_token(token_1)
    # Simulate resolving as WIN
    desk.simulate_resolution("WIN")
    
    # Setup 2: Parabolic hype pump (Should be BLOCKED by Anti-FOMO)
    token_2 = TokenMarketData(
        token="MOONCAT",
        price=0.145,
        support=0.080,
        resistance=0.160,
        pct_move_5m=14.2, # Exploding
        pct_move_15m=45.0, # Parabolic
        pct_move_24h=180.0,
        volume_24h_usd=2_500_000,
        liquidity_usd=350_000,
        orderly_structure=False,
        recent_large_green_candle=True # Top of green candle
    )
    desk.evaluate_token(token_2)
    
    # Setup 3: Illiquid micro-cap (Should be SKIPPED by Scanner)
    token_3 = TokenMarketData(
        token="MICROINU",
        price=0.0012,
        support=0.0010,
        resistance=0.0018,
        pct_move_5m=0.5,
        pct_move_15m=1.0,
        pct_move_24h=5.0,
        volume_24h_usd=12_000,
        liquidity_usd=45_000, # Sub $100k
        orderly_structure=True,
        recent_large_green_candle=False
    )
    desk.evaluate_token(token_3)

    # Setup 4: Prediction market evaluation
    pm_event = PredictionMarketData(
        market="Will ETH ETF staking be approved before Q4 2026?",
        current_implied_prob=0.28,
        event_description="Regulatory decision on staking yields in spot funds.",
        evidence_summary="Multiple institutional amendments filed with dual security disclosures.",
        arguments_yes=["Precedent set in European ETPs", "SEC staff feedback rounds active", "Bipartisan crypto framework bill"],
        arguments_no=["Staff concerns over validator centralization"],
        uncertainty_level="MEDIUM"
    )
    desk.evaluate_prediction_market(pm_event)
    
    # Print ledger statistics
    print("\n" + "="*60)
    print("📈 [DESK PERFORMANCE REPORT — AGENT #6 LOGGER]")
    print("="*60)
    stats = desk.logger.compute_stats()
    for k, v in stats.items():
        print(f"   {k.replace('_', ' ').title():<25}: {v}")
    print(f"   Ledger CSV Location: {LEDGER_CSV}")

if __name__ == "__main__":
    run_demonstration()
