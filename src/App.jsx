import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import "./App.css";
import CustomerService from "./CustomerService";

const MARKETS = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    pair: "BTC/USDT",
    tvSymbol: "BINANCE:BTCUSDT",
    icon: "₿",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    pair: "ETH/USDT",
    tvSymbol: "BINANCE:ETHUSDT",
    icon: "Ξ",
  },
  {
    symbol: "XAUUSD",
    name: "Gold",
    pair: "XAU/USD",
    tvSymbol: "OANDA:XAUUSD",
    icon: "Au",
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    pair: "EUR/USD",
    tvSymbol: "OANDA:EURUSD",
    icon: "€",
  },
];

const ASSETS = [
  { label: "USDT TRC20", value: "USDT_TRC20" },
  { label: "Bitcoin (BTC)", value: "BTC" },
  { label: "Ethereum (ETH)", value: "ETH" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function normalizeAsset(item) {
  const asset = String(item?.asset || item?.coin || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  const network = String(item?.network || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  if (
    asset.includes("USDT") ||
    network.includes("TRC20") ||
    network.includes("TRON")
  ) {
    return "USDT_TRC20";
  }

  if (
    asset === "BTC" ||
    asset.includes("BITCOIN") ||
    network === "BTC" ||
    network.includes("BITCOIN")
  ) {
    return "BTC";
  }

  if (
    asset === "ETH" ||
    asset.includes("ETHEREUM") ||
    network === "ETH" ||
    network.includes("ETHEREUM")
  ) {
    return "ETH";
  }

  return asset;
}

function TradingChart({ symbol }) {
  useEffect(() => {
    const container = document.getElementById("tradingview-chart");
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "1",
      timezone: "Asia/Dhaka",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10,10,10,1)",
      gridColor: "rgba(212,175,55,0.1)",
      allow_symbol_change: true,
      save_image: false,
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div className="chart-container">
      <div id="tradingview-chart">
        <div className="chart-loading">Loading market chart...</div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Home");
  const [session, setSession] = useState(null);
  const [balance, setBalance] = useState(0);
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [tradingOpen, setTradingOpen] = useState(false);
  const [tradingStatusLoading, setTradingStatusLoading] = useState(true);
  const [tradingToggleBusy, setTradingToggleBusy] = useState(false);

  const isAdmin = userRole === "admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
  const [prices, setPrices] = useState({});
  const [priceError, setPriceError] = useState("");

  const [depositAsset, setDepositAsset] = useState("USDT_TRC20");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositAddresses, setDepositAddresses] = useState([]);
  const [copied, setCopied] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);

  const [withdrawAsset, setWithdrawAsset] = useState("USDT_TRC20");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");

  const [tradeSide, setTradeSide] = useState("BUY");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeDuration, setTradeDuration] = useState(30);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [activeTrade, setActiveTrade] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [exitPriceInput, setExitPriceInput] = useState("");
  const closingTradeRef = useRef(null);

  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubject, setSupportSubject] = useState("Customer Support");

  const currentUser = session?.user;

  const selectedDepositAddress = depositAddresses.find((item) => {
    const address = String(item.address || "").trim();

    return (
      normalizeAsset(item) === depositAsset &&
      item.active === true &&
      address.length > 0
    );
  });

  // AUTHENTICATION

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setBalance(0);
      setFullName("");
      setUserRole("");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("balance, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile error:", error.message);
      setNotice("Could not load account profile: " + error.message);
      return;
    }

    if (!data) {
      console.error("No profile found for user:", user.id);
      setNotice("Account profile not found. Please contact support.");
      return;
    }

    setBalance(Number(data.balance ?? 0));
    setFullName(
      data.full_name ||
        user.user_metadata?.full_name ||
        user.email ||
        ""
    );
    setUserRole(data.role || "");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        setSession(data.session);

        if (data.session?.user) {
          await loadProfile(data.session.user);
        }
      } catch (error) {
        console.error(error);
        if (mounted) setNotice(error.message);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user) {
        setTimeout(() => {
          if (mounted) loadProfile(newSession.user);
        }, 0);
            } else {
        setBalance(0);
        setFullName("");
        setUserRole("");
        setDepositHistory([]);
        setWithdrawHistory([]);
        setTradeHistory([]);
        setActiveTrade(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // REFRESH ACCOUNT BALANCE WHILE SIGNED IN
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      loadProfile(currentUser);
    }, 15000);

    return () => clearInterval(timer);
  }, [currentUser, loadProfile]);

  // LOAD DEPOSIT ADDRESSES

  const loadDepositAddresses = useCallback(async () => {
    setAddressesLoading(true);

    try {
      const { data, error } = await supabase
        .from("deposit_addresses")
        .select("*");

      if (error) {
        console.error("Deposit address loading error:", error);
        setDepositAddresses([]);
        setNotice("Could not load deposit addresses: " + error.message);
        return;
      }

      const activeAddresses = (data || []).filter(
        (item) =>
          item.active === true &&
          String(item.address || "").trim().length > 0
      );

      setDepositAddresses(activeAddresses);
    } catch (error) {
      console.error("Unexpected deposit address error:", error);
      setDepositAddresses([]);
      setNotice("Could not load deposit addresses. Please try again.");
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepositAddresses();
  }, [loadDepositAddresses]);

  // LOAD USER HISTORY

  const loadHistory = useCallback(async () => {
    if (!currentUser) return;

    const [deposits, withdrawals, trades] = await Promise.all([
      supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("withdraw_requests")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("trades")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false }),
    ]);

    if (deposits.error) {
      console.error("Deposit history:", deposits.error.message);
    } else {
      setDepositHistory(deposits.data || []);
    }

    if (withdrawals.error) {
      console.error("Withdrawal history:", withdrawals.error.message);
    } else {
      setWithdrawHistory(withdrawals.data || []);
    }

    if (trades.error) {
      console.error("Trade history:", trades.error.message);
    } else {
      const rows = trades.data || [];
      setTradeHistory(rows);

      const openTrade = rows.find(
        (item) => String(item.status || "").toLowerCase() === "open"
      );

      if (openTrade) {
        const startedAt = new Date(openTrade.opened_at || openTrade.created_at || Date.now()).getTime();
        const endsAt = new Date(openTrade.closes_at || (startedAt + Number(openTrade.duration_seconds || 30) * 1000)).getTime();
        setActiveTrade((previous) => {
          if (previous?.id === openTrade.id) return previous;
          return {
            id: openTrade.id,
            symbol: openTrade.market,
            side: String(openTrade.trade_type || "BUY").toUpperCase(),
            amount: Number(openTrade.amount || 0),
            entryPrice: Number(openTrade.entry_price || 0),
            payout: Number(openTrade.profit_percentage || 0),
            startedAt,
            endsAt,
          };
        });
      } else {
        setActiveTrade((previous) => {
          if (previous && !rows.some((item) => item.id === previous.id && String(item.status || "").toLowerCase() === "open")) {
            return null;
          }
          return previous;
        });
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) loadHistory();
  }, [currentUser, loadHistory]);

  // LIVE CRYPTO PRICES

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      try {
        const response = await fetch(
          "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D"
        );

        if (!response.ok) {
          throw new Error("Price feed unavailable.");
        }

        const data = await response.json();

        if (cancelled) return;

        const updated = {};

        data.forEach((item) => {
          updated[item.symbol] = {
            price: Number(item.lastPrice),
            change: Number(item.priceChangePercent),
          };
        });

        setPrices((previous) => ({ ...previous, ...updated }));
        setPriceError("");
      } catch {
        if (!cancelled) {
          setPriceError("Live crypto prices are temporarily unavailable.");
        }
      }
    }

    loadPrices();

    const timer = setInterval(loadPrices, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // LOAD TRADING STATUS
  useEffect(() => {
    let cancelled = false;

    async function loadTradingStatus() {
      const { data, error } = await supabase
        .from("trading_settings")
        .select("is_open")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Trading status error:", error.message);
        setTradingOpen(false);
      } else {
        setTradingOpen(data?.is_open === true);
      }

      setTradingStatusLoading(false);
    }

    loadTradingStatus();

    const timer = setInterval(loadTradingStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // ADMIN: CHANGE TRADING STATUS
  async function changeTradingStatus(nextStatus) {
    if (!isAdmin || tradingToggleBusy) return;

    setTradingToggleBusy(true);
    setNotice("");

    try {
      const { data, error } = await supabase.rpc(
        "set_trading_status",
        { p_is_open: nextStatus }
      );

      if (error) throw error;
      if (data?.success !== true) {
        throw new Error("Trading status update was not confirmed.");
      }

      setTradingOpen(data.is_open === true);
      setNotice(
        data.is_open
          ? "Trading is now ON."
          : "Trading is now OFF."
      );
    } catch (error) {
      setNotice(error.message || "Could not update trading status.");
    } finally {
      setTradingToggleBusy(false);
    }
  }

  // TRADE TIMER

  useEffect(() => {
    if (!activeTrade) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((activeTrade.endsAt - Date.now()) / 1000)
      );

      setRemainingSeconds(remaining);
    }, 250);

    return () => clearInterval(timer);
  }, [activeTrade]);

  function goTo(nextPage) {
    setPage(nextPage);
    setNotice("");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requireLogin(nextPage) {
    if (!session) {
      setNotice("Please sign in to access your account.");
      setAuthMode("login");
      setPage("Account");
      return;
    }

    goTo(nextPage);
  }

  
  // ADMIN PANEL
  function renderAdmin() {
    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">BLACKGOLD EXCHANGE</div>
          <h1>Admin Panel</h1>
          <p>Manage whether new trades can be started.</p>
        </div>

        <div className="panel form-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">TRADING CONTROL</div>
              <h3>Trading Status</h3>
            </div>

            <span className="live-pill">
              {tradingStatusLoading
                ? "LOADING"
                : tradingOpen
                ? "TRADING ON"
                : "TRADING OFF"}
            </span>
          </div>

          <p>
            {tradingOpen
              ? "Users can start new trades."
              : "New trades are currently disabled."}
          </p>

          <button
            type="button"
            className="btn btn-gold full-width"
            disabled={tradingStatusLoading || tradingToggleBusy}
            onClick={() => changeTradingStatus(!tradingOpen)}
          >
            {tradingToggleBusy
              ? "Updating..."
              : tradingStatusLoading
              ? "Loading..."
              : tradingOpen
              ? "Turn Trading OFF"
              : "Turn Trading ON"}
          </button>
        </div>
      </section>
    );
  }

  // LOGIN / REGISTER

  async function handleAuth(event) {
    event.preventDefault();
    setNotice("");

    if (!email.trim() || !password) {
      setNotice("Enter your email and password.");
      return;
    }

    if (authMode === "register") {
      if (!fullName.trim()) {
        setNotice("Enter your full name.");
        return;
      }

      if (password.length < 6) {
        setNotice("Password must contain at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setNotice("Passwords do not match.");
        return;
      }
    }

    setAuthSubmitting(true);

    try {
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        });

        if (error) throw error;

        if (data.session) {
          setNotice("Account created successfully.");
          goTo("Home");
        } else {
          setNotice(
            "Registration successful. Check your email to confirm."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setPassword("");
        goTo("Home");
        setNotice("Login successful.");
      }
    } catch (error) {
      setNotice(error.message || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  }

async function handleForgotPassword() {
  const userEmail = email.trim();

  if (!userEmail) {
    setNotice("Please enter your email first.");
    return;
  }

  setAuthSubmitting(true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      userEmail,
      {
        redirectTo: "http://localhost:5173/",
      }
    );

    if (error) throw error;

    setNotice(
      "Password reset email sent. Please check your inbox and spam folder."
    );
  } catch (error) {
    setNotice(error.message || "Could not send password reset email.");
  } finally {
    setAuthSubmitting(false);
  }
}

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message);
      return;
    }

    setBalance(0);
    setActiveTrade(null);
    goTo("Home");
    setNotice("You have logged out.");
  }

  // COPY DEPOSIT ADDRESS

  async function copyDepositAddress() {
    const address = String(
      selectedDepositAddress?.address || ""
    ).trim();

    if (!address) {
      setNotice("No active wallet address is available for this network.");
      return;
    }

    try {
      await navigator.clipboard.writeText(address);

      setCopied(true);
      setNotice("Deposit address copied successfully!");

      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error("Copy address error:", error);

      setNotice(
        "Automatic copy is unavailable. Select the address and copy it manually."
      );
    }
  }

  // SUBMIT DEPOSIT REQUEST — NO TRANSACTION ID

  async function submitDeposit(event) {
    event.preventDefault();
    setNotice("");

    if (!currentUser) {
      requireLogin("Deposit");
      return;
    }

    const amount = Number(depositAmount);
    const walletAddress = String(
      selectedDepositAddress?.address || ""
    ).trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a valid deposit amount.");
      return;
    }

    if (!walletAddress) {
      setNotice(
        "No active wallet address is available for the selected network."
      );
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: currentUser.id,
          coin: depositAsset,
          amount,
          status: "pending",
        });

      if (error) throw error;

      setDepositAmount("");
      await loadHistory();

      setNotice(
        "Deposit Submitted — Awaiting Blockchain Confirmation."
      );
    } catch (error) {
      console.error("Deposit request error:", error);
      setNotice(error.message || "Could not submit deposit request.");
    } finally {
      setBusy(false);
    }
  }

  // SUBMIT WITHDRAWAL REQUEST

  async function submitWithdrawal(event) {
    event.preventDefault();
    setNotice("");

    if (!currentUser) {
      requireLogin("Withdraw");
      return;
    }

    const amount = Number(withdrawAmount);
    const address = withdrawAddress.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a valid withdrawal amount.");
      return;
    }

    if (amount > balance) {
      setNotice("Your available account balance is insufficient.");
      return;
    }

    if (!address) {
      setNotice("Enter or paste your destination wallet address.");
      return;
    }

    if (address.length < 10) {
      setNotice("Please check your wallet address.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("withdraw_requests")
        .insert({
          user_id: currentUser.id,
          asset: withdrawAsset,
          amount,
          wallet_address: address,
          status: "pending",
        });

      if (error) throw error;

      setWithdrawAmount("");
      setWithdrawAddress("");

      await loadHistory();

      setNotice(
        "Withdrawal request processing. Your balance has not been deducted yet."
      );
    } catch (error) {
      setNotice(error.message || "Could not submit withdrawal request.");
    } finally {
      setBusy(false);
    }
  }

  //  TRADING

  const TRADE_RULES = [
    { min: 100, max: 10000, duration: 30, payout: 20 },
    { min: 11000, max: 30000, duration: 60, payout: 40 },
    { min: 35000, max: 60000, duration: 60, payout: 70 },
    { min: 61000, max: 99000, duration: 60, payout: 120 },
  ];

  async function startDemoTrade(event) {
    event.preventDefault();
    setNotice("");
      if (!tradingOpen) {
    setNotice("Trading is currently closed by admin.");
    return;
  }

    if (!currentUser) {
      requireLogin("Trading");
      return;
    }

    if (activeTrade) {
      setNotice("Please close your active trade first.");
      return;
    }

    const amount = Number(tradeAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a valid trade amount.");
      return;
    }

    if (amount > balance) {
      setNotice("Your available balance is insufficient for this trade.");
      return;
    }

    const rule = TRADE_RULES.find(
      (item) =>
        amount >= item.min &&
        amount <= item.max &&
        item.duration === tradeDuration
    );

    if (!rule) {
      setNotice(
        "Amount does not match your selected duration and configured trading rules."
      );
      return;
    }

    const symbolPrice = prices[selectedMarket.symbol]?.price;

    if (
      selectedMarket.symbol !== "BTCUSDT" &&
      selectedMarket.symbol !== "ETHUSDT"
    ) {
      setNotice(
        "For this version, choose BTC/USDT or ETH/USDT because their entry prices are connected to the live price feed."
      );
      return;
    }

    if (!symbolPrice) {
      setNotice("Waiting for the live entry price. Try again in a moment.");
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase.rpc("start_demo_trade", {
        p_market: selectedMarket.symbol,
        p_trade_type: tradeSide,
        p_amount: amount,
        p_duration_seconds: tradeDuration,
        p_entry_price: symbolPrice,
        p_profit_percentage: rule.payout,
      });

      if (error) throw error;
      const trade = data?.trade;
      if (!trade?.id) throw new Error("Trade was not created. Please try again.");

      const startedAt = new Date(trade.opened_at || Date.now()).getTime();
      const endsAt = new Date(trade.closes_at || (startedAt + tradeDuration * 1000)).getTime();
      setBalance(Number(data.balance ?? Math.max(0, balance - amount)));
      setActiveTrade({
        id: trade.id,
        symbol: trade.market,
        side: String(trade.trade_type || tradeSide).toUpperCase(),
        amount: Number(trade.amount ?? amount),
        entryPrice: Number(trade.entry_price ?? symbolPrice),
        payout: Number(trade.profit_percentage ?? rule.payout),
        startedAt,
        endsAt,
      });

      setRemainingSeconds(tradeDuration);
      setExitPriceInput("");
      setTradeAmount("");

      setNotice(
        `Trade started. Target profit: +$${money((amount * rule.payout) / 100)}. It will close automatically when the timer ends.`
      );

      await loadHistory();
    } catch (error) {
      setNotice(error.message || "Could not start demo trade.");
    } finally {
      setBusy(false);
    }
  }

  const closeDemoTrade = useCallback(async () => {
    const trade = activeTrade;
    const user = currentUser;

    if (!trade?.id || !user || Date.now() < trade.endsAt) return;
    if (closingTradeRef.current === trade.id) return;

    closingTradeRef.current = trade.id;
    setBusy(true);

    try {
      let exitPrice = Number(prices[trade.symbol]?.price || trade.entryPrice || 0);
      if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
        exitPrice = Number(trade.entryPrice || 0);
      }

      const { data, error } = await supabase.rpc("close_demo_trade", {
        p_trade_id: trade.id,
        p_exit_price: exitPrice,
      });

      if (error) throw error;

      setBalance(Number(data?.balance ?? balance));
      setActiveTrade(null);
      setRemainingSeconds(0);
      setExitPriceInput("");
      setNotice(
        `Trade closed: WON. Profit: +$${money(data?.profit_loss)}. New balance: $${money(data?.balance)}.`
      );

      await Promise.all([loadHistory(), loadProfile(user)]);
    } catch (error) {
      console.error("Automatic demo trade close failed:", error);
      setNotice(
        `Automatic trade close failed: ${error.message || "Please check the Supabase SQL setup."} The trade remains open; it will retry automatically.`
      );
    } finally {
      closingTradeRef.current = null;
      setBusy(false);
    }
  }, [activeTrade, currentUser, prices, balance, loadHistory, loadProfile]);

  useEffect(() => {
    if (!activeTrade || remainingSeconds !== 0) return;

    // Try immediately, then retry while the trade is still open if the network
    // or database briefly rejects the first close request.
    closeDemoTrade();
    const retryTimer = setInterval(() => closeDemoTrade(), 1500);
    return () => clearInterval(retryTimer);
  }, [activeTrade, remainingSeconds, closeDemoTrade]);

  // CUSTOMER SUPPORT REQUEST

  async function submitSupport(event) {
    event.preventDefault();
    setNotice("");

    if (!currentUser) {
      requireLogin("Account");
      return;
    }

    if (!supportMessage.trim()) {
      setNotice("Write your support message first.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("support_requests")
        .insert({
          user_id: currentUser.id,
          subject: supportSubject.trim() || "Customer Support",
          message: supportMessage.trim(),
          status: "open",
        });

      if (error) throw error;

      setSupportMessage("");
      setNotice("Support request sent successfully.");
    } catch (error) {
      setNotice(error.message || "Could not send support request.");
    } finally {
      setBusy(false);
    }
  }

  // MARKET HELPERS

  function priceFor(market) {
    const item = prices[market.symbol];

    if (item) return `$${money(item.price)}`;

    return market.symbol === "BTCUSDT" || market.symbol === "ETHUSDT"
      ? "Loading..."
      : "View live chart";
  }

  function openMarket(market) {
    setSelectedMarket(market);
    goTo("Trading");
  }

  function renderMarketCards() {
    return (
      <div className="market-grid">
        {MARKETS.map((market) => {
          const item = prices[market.symbol];

          return (
            <button
              className={`market-card ${
                selectedMarket.symbol === market.symbol ? "selected" : ""
              }`}
              key={market.symbol}
              onClick={() => openMarket(market)}
            >
              <div className="market-card-top">
                <span className="coin-icon">{market.icon}</span>
                <span className="market-pair">{market.pair}</span>

                {item && (
                  <span
                    className={
                      item.change >= 0
                        ? "market-change positive"
                        : "market-change negative"
                    }
                  >
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(2)}%
                  </span>
                )}
              </div>

              <div className="market-name">{market.name}</div>
              <div className="market-price">{priceFor(market)}</div>

              <div className="market-card-footer">
                <span>Open market</span>
                <span>↗️</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // HOME PAGE

  function renderHome() {
    return (
      <>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              MARKET DATA & ANALYTICS
            </div>

            <h1>
              Explore the market.
              <br />
              <span>Discover your edge.</span>
            </h1>

            <p>
              Trade Smarter with BlackGold Exchange.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-gold"
                onClick={() => goTo("Markets")}
              >
                Explore Markets →
              </button>

              {!session ? (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setAuthMode("register");
                    goTo("Account");
                  }}
                >
                  Create Account
                </button>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={() => requireLogin("Deposit")}
                >
                  Deposit Funds
                </button>
              )}
            </div>
          </div>

          <div className="hero-badge">
            <div className="badge-ring">BG</div>
            <div className="badge-title">BLACKGOLD</div>
            <div className="badge-subtitle">EXCHANGE</div>
            <div className="badge-line" />
            <div className="badge-caption">PRECISION · PERFORMANCE</div>
          </div>
        </section>

        <section className="market-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MARKET OVERVIEW</div>
              <h2>Explore the markets</h2>
            </div>

            <button
              className="text-button"
              onClick={() => goTo("Markets")}
            >
              All Markets →
            </button>
          </div>

          {renderMarketCards()}
          {priceError && <p className="muted-message">{priceError}</p>}
        </section>

        <section className="dashboard-grid">
          <div className="panel account-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">YOUR ACCOUNT</div>
                <h3>Account Balance</h3>
              </div>
              <span className="panel-icon balance-wallet-icon">
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="15" rx="3" />
    <path d="M3 10h18M16 15h2" />
    <path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3H19" />
  </svg>
</span>
            </div>

            <div className="balance-value">${money(balance)}</div>

            <div className="balance-caption">
              {session
                ? fullName || "Account balance"
                : "Sign in to view balance"}
            </div>

            <div className="balance-divider" />

            <button
              className="btn btn-gold full-width"
              onClick={() => requireLogin("Deposit")}
            >
              Deposit
            </button>

            <button
              className="btn btn-outline full-width spaced-button"
              onClick={() => requireLogin("Withdraw")}
            >
              Withdraw
            </button>
          </div>

          <div className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">MARKET CHART</div>
                <h3>{selectedMarket.name}</h3>
              </div>
              <span className="live-pill">MARKET</span>
            </div>

            <div className="quick-market-tabs">
              {MARKETS.map((market) => (
                <button
                  key={market.symbol}
                  className={
                    selectedMarket.symbol === market.symbol ? "active" : ""
                  }
                  onClick={() => setSelectedMarket(market)}
                >
                  {market.pair}
                </button>
              ))}
            </div>

            <TradingChart symbol={selectedMarket.tvSymbol} />

            <p className="chart-disclaimer">
              Crypto market Charts.
            </p>
          </div>
        </section>
      </>
    );
  }

  // MARKETS PAGE

  function renderMarkets() {
    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">MARKET DIRECTORY</div>
          <h1>Markets</h1>
          <p>Select a market to explore its chart and information.</p>
        </div>

        {renderMarketCards()}
      </section>
    );
  }

  // TRADING PAGE

  function renderTrading() {
    const item = prices[selectedMarket.symbol];

    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">MARKET TERMINAL</div>
          <h1>{selectedMarket.name}</h1>
          <p>{selectedMarket.pair} ·Trading</p>
        </div>

        <div className="panel terminal-panel">
          <div className="terminal-top">
            <div>
              <div className="terminal-symbol">{selectedMarket.pair}</div>
              <div className="terminal-name">{selectedMarket.name}</div>
            </div>

            <div className="terminal-price">
              <strong>{priceFor(selectedMarket)}</strong>
              {item && (
                <span className={item.change >= 0 ? "positive" : "negative"}>
                  {item.change >= 0 ? "+" : ""}
                  {item.change.toFixed(2)}% (24h)
                </span>
              )}
            </div>
          </div>

          <div className="quick-market-tabs">
            {MARKETS.map((market) => (
              <button
                key={market.symbol}
                className={
                  selectedMarket.symbol === market.symbol ? "active" : ""
                }
                onClick={() => setSelectedMarket(market)}
              >
                {market.pair}
              </button>
            ))}
          </div>

          <TradingChart symbol={selectedMarket.tvSymbol} />
          <div className="notice-box">
            <strong>Available Balance: ${money(balance)} USDT</strong>
            <p>Trade Smarter with BlackGold Exchange.</p>
          </div>

          <form className="trade-form" onSubmit={startDemoTrade}>
            <div className="panel-heading">
              <div>
                <div className="eyebrow">TRADE CONFIGURATION</div>
                <h3>Trade Order</h3>
              </div>
              <span className="live-pill">
                {activeTrade ? "TRADE ACTIVE" : "READY"}
              </span>
            </div>

            <div className="trade-side-buttons">
              <button
                type="button"
                className={tradeSide === "BUY" ? "buy-active" : ""}
                onClick={() => setTradeSide("BUY")}
                disabled={Boolean(activeTrade)}
              >
                BUY
              </button>

              <button
                type="button"
                className={tradeSide === "SELL" ? "sell-active" : ""}
                onClick={() => setTradeSide("SELL")}
                disabled={Boolean(activeTrade)}
              >
                SELL
              </button>
            </div>

            <label className="form-field">
              Amount (USDT)
              <input
                type="number"
                min="100"
                step="0.01"
                value={tradeAmount}
                onChange={(event) => setTradeAmount(event.target.value)}
                placeholder="Enter trade amount"
                disabled={Boolean(activeTrade)}
                required
              />
            </label>

            <label className="form-field">
              Trade Duration
              <select
                value={tradeDuration}
                onChange={(event) =>
                  setTradeDuration(Number(event.target.value))
                }
                disabled={Boolean(activeTrade)}
              >
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </label>

                        {activeTrade && (
              <div className="active-trade-card">
                <div className="active-trade-header">
                  <div className="trade-running-label">
                    <span className="trade-status-dot" />
                    <strong>TRADE IS RUNNING</strong>
                  </div>

                  <span
                    className={`trade-side-badge ${
                      activeTrade.side === "BUY" ? "trade-buy" : "trade-sell"
                    }`}
                  >
                    {activeTrade.side}
                  </span>
                </div>

                <div className="active-trade-grid">
                  <div className="trade-metric">
                    <span>Entry Price</span>
                    <strong>${money(activeTrade.entryPrice)}</strong>
                  </div>

                  <div className="trade-metric">
                    <span>Current Price</span>
                    <strong>
                      ${money(
                        prices[activeTrade.symbol]?.price ||
                          activeTrade.entryPrice
                      )}
                    </strong>
                  </div>

                  <div className="trade-metric trade-timer-metric">
                    <span>Time Remaining</span>
                    <strong>
                      {remainingSeconds}
                      <small> sec</small>
                    </strong>
                  </div>

                  <div className="trade-metric trade-profit-metric">
                    <span>Profit Target</span>
                    <strong>{activeTrade.payout}%</strong>
                    <small>
                      +$
                      {money(
                        (activeTrade.amount * activeTrade.payout) / 100
                      )}
                    </small>
                  </div>
                </div>

                {remainingSeconds === 0 && (
                  <div className="trade-closing-message">
                    Timer finished. Closing trade and processing the result...
                  </div>
                )}
              </div>
            )}

            {!activeTrade && (
              <button
                className="btn btn-gold full-width"
                type="submit"
                disabled={busy || !tradingOpen || tradingStatusLoading}
              >
                {busy
               ? "Please wait..."
               : tradingStatusLoading
               ? "Checking trading status..."
               : tradingOpen
               ? "Start Trade"
               : "Trading"}
              </button>
            )}

            <p className="chart-disclaimer">
              Your Journey. Your Market. Your Future.
            </p>
          </form>
        </div>
      </section>
    );
  }

  // LOGIN / REGISTER PAGE

  function renderAccount() {
    return (
      <section className="auth-layout">
        <div className="auth-intro">
          <div className="badge-ring small">BG</div>
          <div className="eyebrow">BLACKGOLD EXCHANGE</div>
          <h1>
            Your account.
            <br />
            Your markets.
          </h1>
          <p>Sign in or create an account to access your dashboard.</p>
        </div>

        <div className="panel auth-panel">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setNotice("");
              }}
            >
              Sign In
            </button>

            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => {
                setAuthMode("register");
                setNotice("");
              }}
            >
              Register
            </button>
          </div>

          <h2>{authMode === "login" ? "Welcome back" : "Create account"}</h2>

          <p className="auth-description">
            {authMode === "login"
              ? "Enter your login details."
              : "Enter your details to register."}
          </p>

          <form onSubmit={handleAuth}>
            {authMode === "register" && (
              <label className="form-field">
                Full Name
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="form-field">
              Email Address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="form-field">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                required
              />
            </label>
                        {authMode === "login" && (
              <div style={{ textAlign: "right", marginTop: "-8px" }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={authSubmitting}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#d4af37",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "6px 0",
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {authMode === "register" && (
              <label className="form-field">
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}

            <button
              className="btn btn-gold full-width"
              type="submit"
              disabled={authSubmitting}
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          {notice && <div className="notice-box">{notice}</div>}
        </div>
      </section>
    );
  }

  // DEPOSIT PAGE — NO TXID FIELD

  function renderDeposit() {
    const displayedAddress = String(
      selectedDepositAddress?.address || ""
    ).trim();

    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">ACCOUNT FUNDING</div>
          <h1>Deposit</h1>
          <p>
            Select your network, copy the wallet address, enter the amount and
            submit.
          </p>
        </div>

        <div className="form-layout">
          <div className="panel form-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">DEPOSIT REQUEST</div>
                <h3>Deposit Details</h3>
              </div>
              <span className="panel-icon">↓</span>
            </div>

            <form onSubmit={submitDeposit}>
              <label className="form-field">
                Select Network
                <select
                  value={depositAsset}
                  onChange={(event) => {
                    setDepositAsset(event.target.value);
                    setCopied(false);
                    setNotice("");
                  }}
                >
                  {ASSETS.map((asset) => (
                    <option key={asset.value} value={asset.value}>
                      {asset.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-field">
                Wallet Address

                <div
                  className="wallet-address-box"
                  style={{
                    overflowWrap: "anywhere",
                    padding: "14px",
                    border: "1px solid #b89b43",
                    borderRadius: "8px",
                    marginTop: "8px",
                    minHeight: "48px",
                    background: "#101010",
                    color: "#f0cf68",
                  }}
                >
                  {addressesLoading ? (
                    <span aria-live="polite">Loading...</span>
                  ) : displayedAddress ? (
                    displayedAddress
                  ) : (
                    <span>No address available for this network.</span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-outline full-width spaced-button"
                  onClick={copyDepositAddress}
                  disabled={!displayedAddress || addressesLoading}
                >
                  {copied ? "✓ Address Copied" : "📋 Copy Wallet Address"}
                </button>

                {selectedDepositAddress?.instructions && (
                  <p className="chart-disclaimer">
                    {selectedDepositAddress.instructions}
                  </p>
                )}
              </div>

              <label className="form-field">
                Amount
                <input
                  type="number"
                  min="0.00000001"
                  step="any"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </label>

              <button
                className="btn btn-gold full-width"
                type="submit"
                disabled={busy || addressesLoading || !displayedAddress}
              >
                {busy ? "Submitting..." : "Submit Deposit Request"}
              </button>
            </form>

            {notice && <div className="notice-box">{notice}</div>}
          </div>

          <div className="panel info-panel">
            <div className="eyebrow">SUPPORTED ASSETS</div>
            <h3>Deposit Networks</h3>

            {ASSETS.map((asset) => (
              <button
                type="button"
                className="asset-row"
                key={asset.value}
                onClick={() => {
                  setDepositAsset(asset.value);
                  setCopied(false);
                  setNotice("");
                }}
              >
                <span className="coin-icon">
                  {asset.value === "USDT_TRC20"
                    ? "₮"
                    : asset.value === "BTC"
                    ? "₿"
                    : "Ξ"}
                </span>
                <div>
                  <strong>{asset.label}</strong>
                  <small>
                    {asset.value === "USDT_TRC20"
                      ? "TRON / TRC20 network"
                      : asset.value === "BTC"
                      ? "Bitcoin network"
                      : "Ethereum network"}
                  </small>
                </div>
              </button>
            ))}

            <p className="chart-disclaimer">
              Always send funds using the selected network. Sending assets on
              the wrong network may result in permanent loss.
            </p>
          </div>
        </div>

        <div className="panel history-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ACCOUNT ACTIVITY</div>
              <h3>Deposit History</h3>
            </div>

            <button className="text-button" onClick={loadHistory}>
              Refresh ↻
            </button>
          </div>

          {depositHistory.length === 0 ? (
            <div className="empty-state">No deposit requests yet.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Network</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {depositHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.coin}</td>
                      <td>{money(item.amount)}</td>
                      <td>
                        <span className="status-pending">{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  // WITHDRAWAL PAGE

  function renderWithdraw() {
    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">ACCOUNT ACTIVITY</div>
          <h1>Withdraw</h1>
          <p>Select a network and enter the destination wallet address.</p>
        </div>

        <div className="form-layout">
          <div className="panel form-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">WITHDRAWAL REQUEST</div>
                <h3>Withdrawal Details</h3>
              </div>
              <span className="panel-icon">↑</span>
            </div>

            <div className="balance-mini">
              <span>Available balance</span>
              <strong>${money(balance)} USDT</strong>
            </div>

            <form onSubmit={submitWithdrawal}>
              <label className="form-field">
                Select Asset / Network
                <select
                  value={withdrawAsset}
                  onChange={(event) => setWithdrawAsset(event.target.value)}
                >
                  {ASSETS.map((asset) => (
                    <option key={asset.value} value={asset.value}>
                      {asset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Withdrawal Amount
                <input
                  type="number"
                  min="0.00000001"
                  step="any"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </label>

              <label className="form-field">
                Destination Wallet Address
                <input
                  value={withdrawAddress}
                  onChange={(event) =>
                    setWithdrawAddress(event.target.value)
                  }
                  placeholder="Paste your BTC / ETH / TRC20 address"
                  autoComplete="off"
                  required
                />
              </label>

              <button
                type="button"
                className="btn btn-outline full-width"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();

                    if (!text) {
                      setNotice("Clipboard is empty.");
                      return;
                    }

                    setWithdrawAddress(text.trim());
                    setNotice("Wallet address pasted from clipboard.");
                  } catch {
                    setNotice(
                      "Paste permission is unavailable. Tap the address field and paste manually."
                    );
                  }
                }}
              >
                📋 Paste Wallet Address
              </button>

              <button
                className="btn btn-gold full-width spaced-button"
                type="submit"
                disabled={busy}
              >
                {busy ? "Submitting..." : "Submit Withdrawal Request"}
              </button>
            </form>

            {notice && <div className="notice-box">{notice}</div>}
          </div>

          <div className="panel info-panel">
            <div className="eyebrow">BEFORE SUBMITTING</div>
            <h3>Withdrawal Information</h3>

            <div className="info-line">
              <span>Available balance</span>
              <strong>${money(balance)}</strong>
            </div>

            <div className="info-line">
              <span>Selected network</span>
              <strong>
                {ASSETS.find((asset) => asset.value === withdrawAsset)?.label}
              </strong>
            </div>

            <div className="info-line">
              <span>Request status</span>
              <strong>Pending Review</strong>
            </div>

            <p className="chart-disclaimer">
              Check your destination address and network carefully.
            </p>
          </div>
        </div>

        <div className="panel history-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ACCOUNT ACTIVITY</div>
              <h3>Withdrawal History</h3>
            </div>

            <button className="text-button" onClick={loadHistory}>
              Refresh ↻
            </button>
          </div>

          {withdrawHistory.length === 0 ? (
            <div className="empty-state">No withdrawal requests yet.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Destination Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.asset}</td>
                      <td>{money(item.amount)}</td>
                      <td>{item.wallet_address}</td>
                      <td>
                        <span className="status-pending">{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  // HISTORY PAGE

  function renderHistory() {
    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">ACCOUNT ACTIVITY</div>
          <h1>History</h1>
          <p>Review your trading activity.</p>
        </div>

        <div className="panel history-panel">
          <div className="panel-heading">
            <h3>Trading History</h3>
            <button className="text-button" onClick={loadHistory}>
              Refresh ↻
            </button>
          </div>

          {tradeHistory.length === 0 ? (
            <div className="empty-state">No trades to display.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Amount</th>
                    <th>Duration</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>P/L</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.market}</td>
                      <td>{money(item.amount)}</td>
                      <td>{item.duration_seconds}s</td>
                      <td>{item.entry_price ?? "—"}</td>
                      <td>{item.exit_price ?? "—"}</td>
                      <td>{money(item.profit_loss)}</td>
                      <td>{String(item.status || "").toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  // SUPPORT PAGE

  function renderSupport() {
    return (
      <section className="page-section">
        <div className="page-title">
          <div className="eyebrow">CUSTOMER CARE</div>
          <h1>Customer Support</h1>
          <p>Contact BlackGold Exchange support.</p>
        </div>

        <div className="panel form-panel">
          <h3>Telegram Support</h3>
          <p>For direct support, contact our Telegram support account.</p>

          <a
            className="btn btn-gold full-width"
            href="https://t.me/BlackGold_Support"
            target="_blank"
            rel="noreferrer"
          >
            Contact @BlackGold_Support on Telegram
          </a>

          <hr />

          <h3>Send a Support Message</h3>

          <form onSubmit={submitSupport}>
            <label className="form-field">
              Subject
              <input
                value={supportSubject}
                onChange={(event) => setSupportSubject(event.target.value)}
                placeholder="What do you need help with?"
                required
              />
            </label>

            <label className="form-field">
              Message
              <textarea
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                placeholder="Describe your issue"
                rows="5"
                required
              />
            </label>

            <button className="btn btn-gold full-width" disabled={busy}>
              {busy ? "Sending..." : "Send Support Request"}
            </button>
          </form>

          {notice && <div className="notice-box">{notice}</div>}
        </div>
      </section>
    );
  }

  // APP SHELL

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="badge-ring small">BG</div>
        <p>Loading BLACKGOLD EXCHANGE...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        
<button
  className="brand"
  onClick={() => goTo("Home")}
  aria-label="BlackGold Exchange Home"
>
  <img
    src="/bg-logo.svg"
    alt="BlackGold Exchange"
    className="responsive-brand-logo"
  />
</button>

        <button
          className="mobile-menu-button"
          onClick={() => setMobileMenu((value) => !value)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <nav className={`nav-links ${mobileMenu ? "mobile-open" : ""}`}>
          {["Home", "Markets", "Trading"].map((item) => (
            <button
              key={item}
              className={page === item ? "nav-active" : ""}
              onClick={() => goTo(item)}
            >
              {item}
            </button>
          ))}

          {session && (
            <>
              {["Deposit", "Withdraw", "History", "Support"].map((item) => (
                <button
                  key={item}
                  className={page === item ? "nav-active" : ""}
                  onClick={() => requireLogin(item)}
                >
                  {item}
                </button>
              ))}
            </>
          )}
                    {session && isAdmin && (
            <button
              className={page === "Admin" ? "nav-active" : ""}
              onClick={() => requireLogin("Admin")}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="nav-account">
          {session ? (
            <>
              <span className="user-email">{session.user.email}</span>
              <button
                className="btn btn-outline btn-small"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="btn btn-gold btn-small"
              onClick={() => {
                setAuthMode("login");
                goTo("Account");
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {notice && page !== "Account" && (
          <div className="notice-box global-notice" role="status">
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {page === "Home" && renderHome()}
        {page === "Markets" && renderMarkets()}
        {page === "Trading" && renderTrading()}
        {page === "Account" && renderAccount()}
        {page === "Deposit" && renderDeposit()}
        {page === "Withdraw" && renderWithdraw()}
        {page === "History" && renderHistory()}
        {page === "Support" && renderSupport()}
        {page === "Admin" &&
  (session && isAdmin ? (
    renderAdmin()
  ) : (
    <section className="page-section">
      <h1>Access denied</h1>
      <p>Admin permission required.</p>
    </section>
  ))}
      </main>

      <CustomerService />

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark">BG</span>
          <span className="brand-copy">
            <strong>BLACKGOLD</strong>
            <small>EXCHANGE</small>
          </span>
        </div>

        <p>Explore markets with BLACKGOLD EXCHANGE Trades.</p>

        <a
          href="https://t.me/BlackGold_Support"
          target="_blank"
          rel="noreferrer"
        >
          Telegram Customer Support
        </a>

        <span className="footer-copy">
          © {new Date().getFullYear()} BLACKGOLD EXCHANGE
        </span>
      </footer>
    </div>
  );
}

export default App;
