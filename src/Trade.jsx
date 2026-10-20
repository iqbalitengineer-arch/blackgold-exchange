import { useEffect, useState } from "react";

const TRADE_OPTIONS = [
  { label: "30 Seconds", seconds: 30, profit: 20 },
  { label: "60 Seconds", seconds: 60, profit: 40 },
  { label: "1 Minute", seconds: 60, profit: 70 },
  { label: "2 Minutes", seconds: 120, profit: 120 },
];

export default function Trade() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("10");
  const [selected, setSelected] = useState(TRADE_OPTIONS[0]);
  const [direction, setDirection] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [trade, setTrade] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!trade || remaining <= 0) return;

    const timer = setTimeout(() => {
      setRemaining((time) => time - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [trade, remaining]);

  useEffect(() => {
    if (!trade || remaining !== 0) return;

    const payout = (trade.amount * trade.profit) / 100;

    // Clearly labeled simulated outcome for testing only.
    const won = Math.random() >= 0.5;
    const net = won ? payout : -trade.amount;

    setBalance((current) => current + trade.amount + net);
    setResult({
      won,
      net,
      amount: trade.amount,
      direction: trade.direction,
    });

    setTrade(null);
    setDirection(null);
  }, [remaining, trade]);

  function startTrade(side) {
    const value = Number(amount);

    if (trade) {
      alert("Please wait until your current trade finishes.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      alert("Enter a valid trade amount.");
      return;
    }

    if (value > balance) {
      alert("Insufficient virtual balance.");
      return;
    }

    setBalance((current) => current - value);
    setResult(null);
    setDirection(side);
    setTrade({
      amount: value,
      profit: selected.profit,
      direction: side,
    });
    setRemaining(selected.seconds);
  }

  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;

  return (
    <main className="trade-page">
      <style>{`
        .trade-page {
          max-width: 1000px;
          margin: 24px auto;
          padding: 24px;
          color: #f5f5f5;
          background: #101010;
          border: 1px solid #b99437;
          border-radius: 16px;
          font-family: Arial, sans-serif;
        }
        .trade-page h1, .trade-page h2 { color: #e8c45b; }
        .trade-balance {
          padding: 16px;
          margin: 16px 0;
          background: #1d1d1d;
          border-radius: 10px;
        }
        .trade-options {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 16px 0;
        }
        .trade-page button, .trade-page input {
          box-sizing: border-box;
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }
        .trade-page button {
          cursor: pointer;
          border: 1px solid #b99437;
          background: #222;
          color: white;
        }
        .trade-page button.active {
          background: #b99437;
          color: #111;
          font-weight: bold;
        }
        .trade-page input {
          background: #1d1d1d;
          border: 1px solid #555;
          color: white;
          margin: 8px 0 16px;
        }
        .trade-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .trade-page button.buy { background: #087c53; }
        .trade-page button.sell { background: #b83232; }
        .trade-page button:disabled { opacity: .5; cursor: not-allowed; }
        .trade-notice {
          padding: 12px;
          margin-top: 16px;
          background: #222;
          border-radius: 8px;
          line-height: 1.6;
        }
        @media(max-width: 600px) {
          .trade-options { grid-template-columns: 1fr 1fr; }
          .trade-page { margin: 10px; padding: 14px; }
        }
      `}</style>

      <h1>BlackGold Exchange</h1>
      <h2>Gold (XAU/USD)</h2>

      <div className="trade-balance">
        <div>Virtual Balance</div>
        <h2>${balance.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USDT</h2>
        <small>Testing mode — virtual balance only</small>
      </div>

      <h3>Select Trade Duration</h3>

      <div className="trade-options">
        {TRADE_OPTIONS.map((option, index) => (
          <button
            key={`${option.label}-${index}`}
            className={selected === option ? "active" : ""}
            onClick={() => setSelected(option)}
            disabled={Boolean(trade)}
          >
            {option.label}
            <br />
            {option.profit}% payout
          </button>
        ))}
      </div>

      <label htmlFor="trade-amount">Trade Amount (USDT)</label>
      <input
        id="trade-amount"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        disabled={Boolean(trade)}
      />

      <div className="trade-actions">
        <button
          className="buy"
          onClick={() => startTrade("BUY")}
          disabled={Boolean(trade)}
        >
          BUY
        </button>
        <button
          className="sell"
          onClick={() => startTrade("SELL")}
          disabled={Boolean(trade)}
        >
          SELL
        </button>
      </div>

      {trade && (
        <div className="trade-notice">
          <h2>{direction} Trade Running</h2>
          <h1>{formatTime(remaining)}</h1>
          <p>Amount: ${trade.amount.toFixed(2)}</p>
          <p>Selected payout: {trade.profit}%</p>
        </div>
      )}

      {result && (
        <div className="trade-notice">
          <h2>{result.won ? "SIMULATED WIN" : "SIMULATED LOSS"}</h2>
          <p>Direction: {result.direction}</p>
          <p>Trade amount: ${result.amount.toFixed(2)}</p>
          <p>
            Net {result.net >= 0 ? "Profit" : "Loss"}: $
            {Math.abs(result.net).toFixed(2)}
          </p>
        </div>
      )}

      <div className="trade-notice">
        <strong>Important:</strong> This is a local testing interface.
        The displayed outcome is randomly simulated, not calculated from
        real Gold prices. The balance resets when the page is refreshed.
        No real deposits or withdrawals are supported here.
      </div>
    </main>
  );
}