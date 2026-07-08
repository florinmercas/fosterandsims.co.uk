/* =========================================================
   Foster & Sims — Global site behaviour (nav, cart badge, footer year)
   ========================================================= */

(function () {
  "use strict";

  var CART_KEY = "fs_cart_v1";

  /* ---------- Cart helpers (shared across every page) ---------- */
  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
  }

  function addToCart(item) {
    var cart = getCart();
    item.id = "b" + Date.now() + Math.floor(Math.random() * 1000);
    cart.push(item);
    setCart(cart);
    return item.id;
  }

  function removeFromCart(id) {
    var cart = getCart().filter(function (i) { return i.id !== id; });
    setCart(cart);
  }

  function clearCart() {
    setCart([]);
  }

  function cartTotal() {
    return getCart().reduce(function (sum, i) { return sum + (Number(i.price) || 0); }, 0);
  }

  function updateCartBadge() {
    var badges = document.querySelectorAll("[data-cart-count]");
    var count = getCart().length;
    badges.forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? "flex" : "none";
    });
  }

  window.FSCart = {
    getCart: getCart,
    setCart: setCart,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    cartTotal: cartTotal
  };

  /* ---------- Mobile nav ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();

    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".menu-toggle");
    if (toggle && header) {
      toggle.addEventListener("click", function () {
        header.classList.toggle("nav-open");
      });
    }

    // Mobile dropdown expand-on-tap
    document.querySelectorAll(".has-dropdown > a").forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (window.innerWidth <= 760) {
          e.preventDefault();
          link.parentElement.classList.toggle("open");
        }
      });
    });

    // Sticky header shadow
    var onScroll = function () {
      if (!header) return;
      if (window.scrollY > 8) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();

    // Footer year
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    // Highlight active nav link
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a[href]").forEach(function (a) {
      var href = a.getAttribute("href").split("/").pop();
      if (href === path) a.classList.add("active");
    });

    // Simple reveal-on-scroll
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  });
})();
