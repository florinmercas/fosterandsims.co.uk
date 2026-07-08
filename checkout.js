/* =========================================================
   Foster & Sims — Checkout (cart review, customer + payment, confirm)
   NOTE FOR DEVELOPER: This is a front-end demo checkout only. Card details
   are validated client-side but NOT transmitted or charged anywhere. Before
   taking real payments, wire this form up to a PCI-compliant gateway such
   as Stripe, SumUp or Worldpay and move all charge logic server-side.
   ========================================================= */

(function () {
  "use strict";

  var payMethod = "card"; // 'card' | 'collection'

  function currency(n) {
    return "£" + Number(n).toFixed(2);
  }

  function iconFor(type) {
    return type === "MOT Test" ? "&#128663;" : "&#128295;";
  }

  function renderCart() {
    var listEl = document.getElementById("cartList");
    var cart = window.FSCart.getCart();

    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = '<p class="empty-note">Your booking basket is empty. <a href="booking.html" style="color:var(--red-600); font-weight:700;">Book an MOT or service &rarr;</a></p>';
    } else {
      listEl.innerHTML = cart.map(function (item) {
        return (
          '<div class="cart-item" data-id="' + item.id + '">' +
          '<div class="icon-badge">' + iconFor(item.type) + "</div>" +
          '<div class="meta">' +
          "<h4>" + item.label + "</h4>" +
          '<div class="tags">' +
          '<span class="tag">' + item.type + "</span>" +
          '<span class="tag">' + item.reg.toUpperCase() + "</span>" +
          '<span class="tag">' + niceDate(item.date) + " · " + item.slot + "</span>" +
          "</div>" +
          "<button class=\"remove-btn\" data-remove=\"" + item.id + "\">Remove</button>" +
          "</div>" +
          '<div class="price-col"><div class="amt">' + currency(item.price) + "</div></div>" +
          "</div>"
        );
      }).join("");
    }

    renderTotals();
    updateBadgeVisibility();

    listEl.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.FSCart.removeFromCart(btn.getAttribute("data-remove"));
        renderCart();
      });
    });
  }

  function niceDate(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function renderTotals() {
    var cart = window.FSCart.getCart();
    var subtotal = cart.reduce(function (s, i) { return s + Number(i.price); }, 0);
    var el = document.getElementById("checkoutTotals");
    if (!el) return;
    el.innerHTML =
      '<div class="summary-line"><span>Subtotal</span><span>' + currency(subtotal) + "</span></div>" +
      '<div class="summary-line"><span>Booking fee</span><span>£0.00</span></div>' +
      '<div class="summary-total"><span>Total due</span><span>' + currency(subtotal) + "</span></div>";

    var payBtn = document.getElementById("payButton");
    if (payBtn) payBtn.disabled = cart.length === 0;
  }

  function updateBadgeVisibility() {
    var cart = window.FSCart.getCart();
    var empty = cart.length === 0;
    document.querySelectorAll(".checkout-hide-when-empty").forEach(function (el) {
      el.classList.toggle("hidden", empty);
    });
  }

  /* ---------- Payment method toggle ---------- */
  function bindPayToggle() {
    document.querySelectorAll(".pay-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        payMethod = opt.getAttribute("data-pay");
        document.querySelectorAll(".pay-option").forEach(function (o) { o.classList.remove("selected"); });
        opt.classList.add("selected");
        document.getElementById("cardFields").classList.toggle("hidden", payMethod !== "card");
        var payBtn = document.getElementById("payButton");
        if (payBtn) payBtn.textContent = payMethod === "card" ? "Pay & confirm booking" : "Confirm booking (pay on collection)";
      });
    });
  }

  /* ---------- Card formatting & validation ---------- */
  function luhnValid(numStr) {
    var digits = numStr.replace(/\D/g, "");
    if (digits.length < 12) return false;
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = parseInt(digits.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function bindCardFormatting() {
    var numEl = document.getElementById("cardNumber");
    if (numEl) {
      numEl.addEventListener("input", function () {
        var digits = numEl.value.replace(/\D/g, "").slice(0, 19);
        numEl.value = digits.replace(/(.{4})/g, "$1 ").trim();
        updateCardVisual();
      });
    }
    var expEl = document.getElementById("cardExpiry");
    if (expEl) {
      expEl.addEventListener("input", function () {
        var digits = expEl.value.replace(/\D/g, "").slice(0, 4);
        if (digits.length >= 3) digits = digits.slice(0, 2) + "/" + digits.slice(2);
        expEl.value = digits;
        updateCardVisual();
      });
    }
    var nameEl = document.getElementById("cardName");
    if (nameEl) nameEl.addEventListener("input", updateCardVisual);
    var cvcEl = document.getElementById("cardCvc");
    if (cvcEl) cvcEl.addEventListener("input", function () {
      cvcEl.value = cvcEl.value.replace(/\D/g, "").slice(0, 4);
    });
  }

  function updateCardVisual() {
    var num = val("cardNumber") || "•••• •••• •••• ••••";
    var name = (val("cardName") || "YOUR NAME").toUpperCase();
    var exp = val("cardExpiry") || "MM/YY";
    var numOut = document.getElementById("visualNumber");
    var nameOut = document.getElementById("visualName");
    var expOut = document.getElementById("visualExpiry");
    if (numOut) numOut.textContent = num;
    if (nameOut) nameOut.textContent = name;
    if (expOut) expOut.textContent = exp;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function setError(id, show) {
    var field = document.getElementById(id);
    if (!field) return;
    var wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("error", !!show);
  }

  function validateContact() {
    var ok = true;
    var name = val("checkoutName").length >= 2;
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("checkoutEmail"));
    var phone = /^[0-9+()\s-]{7,}$/.test(val("checkoutPhone"));
    setError("checkoutName", !name); if (!name) ok = false;
    setError("checkoutEmail", !email); if (!email) ok = false;
    setError("checkoutPhone", !phone); if (!phone) ok = false;
    return ok;
  }

  function validateCard() {
    var ok = true;
    var name = val("cardName").length >= 2;
    var number = luhnValid(val("cardNumber"));
    var expiry = /^(0[1-9]|1[0-2])\/\d{2}$/.test(val("cardExpiry"));
    var cvc = /^\d{3,4}$/.test(val("cardCvc"));
    setError("cardName", !name); if (!name) ok = false;
    setError("cardNumber", !number); if (!number) ok = false;
    setError("cardExpiry", !expiry); if (!expiry) ok = false;
    setError("cardCvc", !cvc); if (!cvc) ok = false;
    return ok;
  }

  function genRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var ref = "FS-";
    for (var i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    return ref;
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    var cart = window.FSCart.getCart();
    if (cart.length === 0) return;

    if (!validateContact()) return;
    if (payMethod === "card" && !validateCard()) return;

    var payBtn = document.getElementById("payButton");
    var form = document.getElementById("checkoutForm");
    payBtn.disabled = true;
    payBtn.textContent = "Processing…";

    setTimeout(function () {
      var ref = genRef();
      var totalEl = document.querySelector("#checkoutTotals .summary-total span:last-child");
      var total = totalEl ? totalEl.textContent : "";

      form.classList.add("hidden");
      document.getElementById("checkoutSidebar").classList.add("hidden");

      var conf = document.getElementById("confirmationPanel");
      conf.classList.remove("hidden");
      conf.innerHTML =
        '<div class="confirmation">' +
        '<div class="tick">&#10003;</div>' +
        "<h2>Booking confirmed</h2>" +
        '<p>Thanks, ' + val("checkoutName") + '! A confirmation has been sent to ' + val("checkoutEmail") + ".</p>" +
        '<div class="ref">Reference ' + ref + "</div>" +
        '<p class="lede center">' + (payMethod === "card" ? "Payment of " + total + " received." : "You’ve chosen to pay " + total + " on collection.") + " We’ll text or call you to confirm your slot at Unit 1, Greetwell Hollow, Crofton Drive, Lincoln LN3 4NR." + "</p>" +
        '<div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:20px;">' +
        '<a href="index.html" class="btn btn-ghost">Back to home</a>' +
        '<a href="booking.html" class="btn btn-primary">Book another service</a>' +
        "</div></div>";

      window.FSCart.clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("cartList")) return; // not checkout page

    renderCart();
    bindPayToggle();
    bindCardFormatting();
    updateCardVisual();

    var form = document.getElementById("checkoutForm");
    if (form) form.addEventListener("submit", handlePaySubmit);
  });
})();
