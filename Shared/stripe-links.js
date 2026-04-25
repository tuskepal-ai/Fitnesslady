(function(){
  const STRIPE_LINKS = {
    live: {
      start: "https://buy.stripe.com/eVq9AT1BkaXG0Ir8Gh2Ji04",
      balance: "https://buy.stripe.com/bJeeVdgwe2ragHpe0B2Ji05",
      pro: "https://buy.stripe.com/14A9AT5RAgi0cr9aOp2Ji06"
    },
    test: {
      start: "https://buy.stripe.com/test_7sY4gzcfH5pDaRXbBW0RG00",
      balance: "https://buy.stripe.com/test_5kQ3cv2F7dW9aRX49u0RG01",
      pro: "https://buy.stripe.com/test_14AdR993v7xL3pv6hC0RG03"
    }
  };

  function normalizePlan(plan){
    const value = String(plan || "").trim().toLowerCase();
    if (value === "start" || value === "start_v1") return "start";
    if (value === "balance" || value === "balance_v1") return "balance";
    if (value === "pro" || value === "pro_v1") return "pro";
    return "";
  }

  function resolveMode(explicitMode){
    const urlMode = new URLSearchParams(window.location.search).get("stripeMode");
    const storedMode = window.localStorage.getItem("fl_stripe_mode");
    const requested = String(explicitMode || urlMode || storedMode || "live").trim().toLowerCase();
    return requested === "test" ? "test" : "live";
  }

  function getStripeUrl(plan, options = {}){
    const mode = resolveMode(options.mode);
    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan) return "";
    return STRIPE_LINKS[mode]?.[normalizedPlan] || "";
  }

  window.FITNESSLADY_STRIPE_LINKS = STRIPE_LINKS;
  window.getFitnessLadyStripeUrl = getStripeUrl;
  window.getFitnessLadyStripeMode = resolveMode;
})();
