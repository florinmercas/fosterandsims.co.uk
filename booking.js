/* =========================================================
   Foster & Sims — Booking engine (MOT + Service/Repair)
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Catalogue ---------- */
  var MOT = { id: "mot", name: "MOT Test", price: 39, duration: "45 mins", desc: "Full Class 4 MOT test for cars & light vans." };

  var SERVICES = [
    { id: "interim", name: "Interim Service", price: 89, duration: "1 hr", desc: "Oil, filter & safety check — every 6 months." },
    { id: "full", name: "Full Service", price: 159, duration: "2 hrs", desc: "Manufacturer-schedule full service, OE parts." },
    { id: "brakes", name: "Brakes", price: 129, duration: "1.5 hrs", desc: "Pads, discs & fluid inspection or replacement." },
    { id: "clutch", name: "Clutch Replacement", price: 349, duration: "Full day", desc: "Clutch kit supplied & fitted." },
    { id: "timing", name: "Timing Belt / Chain", price: 279, duration: "Full day", desc: "OE timing kit, water pump inspection." },
    { id: "diagnostic", name: "Diagnostic / Fault Finding", price: 59, duration: "45 mins", desc: "Warning light & fault code diagnosis." },
    { id: "aircon", name: "Air Con Re-gas & Repair", price: 79, duration: "1 hr", desc: "Re-gas, leak detection & repair." },
    { id: "dpf", name: "DPF Clean", price: 149, duration: "1.5 hrs", desc: "Diesel particulate filter clean, restore power." },
    { id: "adas", name: "ADAS Calibration", price: 119, duration: "1 hr", desc: "Camera & sensor calibration after glass or suspension work." },
    { id: "keys", name: "Key Repair / Replacement", price: 99, duration: "1 hr", desc: "Spare & replacement key cutting and programming." },
    { id: "recovery", name: "Recovery Collection", price: 65, duration: "Varies", desc: "We collect your vehicle and bring it to the workshop." }
  ];

  var state = {
    activeTab: "mot",
    mot: { date: null, slot: null },
    service: { serviceId: null, date: null, slot: null, courtesyCar: false }
  };

  /* ---------- Date / slot helpers ---------- */
  function nextBusinessDays(count) {
    var days = [];
    var d = new Date();
    d.setDate(d.getDate() + 1); // earliest tomorrow
    while (days.length < count) {
      var day = d.getDay();
      if (day !== 0 && day !== 6) {
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  var ALL_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

  function slotsForDate(dateStr) {
    // Deterministic pseudo-availability so it looks realistic but is stable per date
    var seed = 0;
    for (var i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
    return ALL_SLOTS.map(function (t, idx) {
      var unavailable = (seed + idx * 7) % 5 === 0;
      return { time: t, available: !unavailable };
    });
  }

  function fmtDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function dowShort(d) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  }

  function niceDate(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  /* ---------- Rendering ---------- */
  function renderServiceOptions() {
    var wrap = document.getElementById("serviceOptions");
    if (!wrap) return;
    wrap.innerHTML = SERVICES.map(function (s) {
      var selected = state.service.serviceId === s.id;
      return (
        '<div class="service-option' + (selected ? " selected" : "") + '" data-service="' + s.id + '">' +
        '<div class="check">' + (selected ? "&#10003;" : "") + "</div>" +
        "<h4>" + s.name + "</h4>" +
        '<div class="price">from £' + s.price + " &middot; " + s.duration + "</div>" +
        '<div class="desc">' + s.desc + "</div>" +
        "</div>"
      );
    }).join("");

    wrap.querySelectorAll(".service-option").forEach(function (el) {
      el.addEventListener("click", function () {
        state.service.serviceId = el.getAttribute("data-service");
        renderServiceOptions();
        renderSummary();
      });
    });
  }

  function renderDateGrid(prefix) {
    var wrap = document.getElementById(prefix + "DateGrid");
    if (!wrap) return;
    var days = nextBusinessDays(14);
    var current = state[prefix].date;

    wrap.innerHTML = days.map(function (d) {
      var ds = fmtDate(d);
      var selected = current === ds;
      return (
        '<div class="date-cell' + (selected ? " selected" : "") + '" data-date="' + ds + '">' +
        '<span class="dow">' + dowShort(d) + "</span>" +
        '<span class="dom">' + d.getDate() + "</span>" +
        "</div>"
      );
    }).join("");

    wrap.querySelectorAll(".date-cell").forEach(function (el) {
      el.addEventListener("click", function () {
        state[prefix].date = el.getAttribute("data-date");
        state[prefix].slot = null;
        renderDateGrid(prefix);
        renderSlotGrid(prefix);
        renderSummary();
      });
    });
  }

  function renderSlotGrid(prefix) {
    var wrap = document.getElementById(prefix + "SlotGrid");
    if (!wrap) return;
    var dateStr = state[prefix].date;
    if (!dateStr) {
      wrap.innerHTML = '<p class="hint" style="grid-column:1/-1;">Pick a date above to see available times.</p>';
      return;
    }
    var slots = slotsForDate(dateStr);
    var current = state[prefix].slot;

    wrap.innerHTML = slots.map(function (s) {
      var classes = ["slot"];
      if (!s.available) classes.push("unavailable");
      if (current === s.time) classes.push("selected");
      return '<div class="' + classes.join(" ") + '" data-time="' + s.time + '">' + s.time + "</div>";
    }).join("");

    wrap.querySelectorAll(".slot:not(.unavailable)").forEach(function (el) {
      el.addEventListener("click", function () {
        state[prefix].slot = el.getAttribute("data-time");
        renderSlotGrid(prefix);
        renderSummary();
      });
    });
  }

  function renderSummary() {
    var box = document.getElementById("bookingSummary");
    if (!box) return;

    var lines = [];
    var total = 0;

    if (state.activeTab === "mot") {
      total = MOT.price;
      lines.push({
        title: MOT.name,
        sub: state.mot.date ? niceDate(state.mot.date) + (state.mot.slot ? " · " + state.mot.slot : "") : "Choose a date & time",
        price: MOT.price
      });
    } else {
      var svc = SERVICES.filter(function (s) { return s.id === state.service.serviceId; })[0];
      total = svc ? svc.price : 0;
      if (state.service.courtesyCar) total += 15;
      lines.push({
        title: svc ? svc.name : "Choose a service",
        sub: state.service.date ? niceDate(state.service.date) + (state.service.slot ? " · " + state.service.slot : "") : "Choose a date & time",
        price: svc ? svc.price : 0
      });
      if (state.service.courtesyCar) {
        lines.push({ title: "Courtesy car", sub: "For the day of your appointment", price: 15 });
      }
    }

    box.innerHTML =
      "<h3>Your booking <span class=\"pill\">Step summary</span></h3>" +
      lines.map(function (l) {
        return (
          '<div class="summary-line"><div><b>' + l.title + "</b><br><span class=\"muted\">" + l.sub + "</span></div>" +
          "<div>£" + l.price + "</div></div>"
        );
      }).join("") +
      '<div class="summary-total"><span>Estimated total</span><span>£' + total + "</span></div>" +
      '<p class="hint">Final price confirmed on inspection. A courtesy car can be requested at check-in subject to availability.</p>' +
      '<button class="btn btn-primary btn-block" id="addBookingBtn" style="margin-top:16px;">Add to booking &rarr;</button>';

    document.getElementById("addBookingBtn").addEventListener("click", handleAddBooking);
  }

  /* ---------- Validation ---------- */
  function setError(fieldId, show) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("error", !!show);
  }

  function validateCustomerForm(prefix) {
    var ok = true;
    var reg = document.getElementById(prefix + "Reg");
    var name = document.getElementById(prefix + "Name");
    var phone = document.getElementById(prefix + "Phone");
    var email = document.getElementById(prefix + "Email");

    var regOk = reg && reg.value.trim().length >= 2;
    var nameOk = name && name.value.trim().length >= 2;
    var phoneOk = phone && /^[0-9+()\s-]{7,}$/.test(phone.value.trim());
    var emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());

    setError(prefix + "Reg", !regOk); if (!regOk) ok = false;
    setError(prefix + "Name", !nameOk); if (!nameOk) ok = false;
    setError(prefix + "Phone", !phoneOk); if (!phoneOk) ok = false;
    setError(prefix + "Email", !emailOk); if (!emailOk) ok = false;

    return ok;
  }

  function handleAddBooking() {
    var prefix = state.activeTab;
    var alertBox = document.getElementById("bookingAlert");

    if (prefix === "mot") {
      if (!state.mot.date || !state.mot.slot) {
        showAlert("Please choose a date and time slot for your MOT.", "info");
        return;
      }
      if (!validateCustomerForm("mot")) {
        showAlert("Please complete your details correctly before continuing.", "info");
        return;
      }
      var item = {
        type: "MOT Test",
        label: "MOT Test",
        price: MOT.price,
        date: state.mot.date,
        slot: state.mot.slot,
        reg: val("motReg"),
        name: val("motName"),
        phone: val("motPhone"),
        email: val("motEmail"),
        mileage: val("motMileage"),
        notes: val("motNotes")
      };
      window.FSCart.addToCart(item);
      afterAdd();
    } else {
      if (!state.service.serviceId) {
        showAlert("Please choose a service or repair type.", "info");
        return;
      }
      if (!state.service.date || !state.service.slot) {
        showAlert("Please choose a date and time slot for your appointment.", "info");
        return;
      }
      if (!validateCustomerForm("service")) {
        showAlert("Please complete your details correctly before continuing.", "info");
        return;
      }
      var svc = SERVICES.filter(function (s) { return s.id === state.service.serviceId; })[0];
      var price = svc.price + (state.service.courtesyCar ? 15 : 0);
      var item2 = {
        type: "Service / Repair",
        label: svc.name + (state.service.courtesyCar ? " + Courtesy car" : ""),
        price: price,
        date: state.service.date,
        slot: state.service.slot,
        reg: val("serviceReg"),
        name: val("serviceName"),
        phone: val("servicePhone"),
        email: val("serviceEmail"),
        mileage: val("serviceMileage"),
        notes: val("serviceNotes")
      };
      window.FSCart.addToCart(item2);
      afterAdd();
    }
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function afterAdd() {
    showAlert("Added to your booking basket. You can add another vehicle or service, or proceed to checkout.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showAlert(msg, type) {
    var box = document.getElementById("bookingAlert");
    if (!box) return;
    box.className = "alert alert-" + type;
    box.innerHTML = msg + ' &nbsp; <a href="checkout.html" style="text-decoration:underline; font-weight:800;">Go to checkout &rarr;</a>';
    box.classList.remove("hidden");
  }

  /* ---------- Tabs ---------- */
  function bindTabs() {
    document.querySelectorAll(".booking-tabs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.activeTab = btn.getAttribute("data-tab");
        document.querySelectorAll(".booking-tabs button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.add("hidden"); });
        document.getElementById("panel-" + state.activeTab).classList.remove("hidden");
        var box = document.getElementById("bookingAlert");
        if (box) box.classList.add("hidden");
        renderSummary();
      });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("bookingSummary")) return; // not the booking page

    // Deep link support: booking.html?tab=service&service=full
    var params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "service") {
      state.activeTab = "service";
      document.querySelector('.booking-tabs button[data-tab="mot"]').classList.remove("active");
      document.querySelector('.booking-tabs button[data-tab="service"]').classList.add("active");
      document.getElementById("panel-mot").classList.add("hidden");
      document.getElementById("panel-service").classList.remove("hidden");
    }
    if (params.get("service")) {
      state.service.serviceId = params.get("service");
    }

    bindTabs();
    renderServiceOptions();
    renderDateGrid("mot");
    renderSlotGrid("mot");
    renderDateGrid("service");
    renderSlotGrid("service");
    renderSummary();

    document.querySelectorAll(".courtesy-toggle").forEach(function (cb) {
      cb.addEventListener("change", function () {
        state.service.courtesyCar = cb.checked;
        renderSummary();
      });
    });
  });
})();
