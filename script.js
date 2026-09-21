(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------- Header: menu, shadow on scroll ---------- */
  const header = $("site-header");
  const menuBtn = $("menu-btn");
  const nav = $("site-nav");

  const setMenu = (open) => {
    header.dataset.open = String(open);
    menuBtn.setAttribute("aria-expanded", String(open));
  };
  menuBtn.addEventListener("click", () =>
    setMenu(header.dataset.open !== "true"),
  );
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.dataset.open === "true") {
      setMenu(false);
      menuBtn.focus();
    }
  });

  const onScroll = () => {
    header.dataset.scrolled = String(window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Theme toggle (follows the system until the visitor chooses) ---------- */
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  $("theme-toggle").addEventListener("click", () => {
    const isDark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : darkQuery.matches;
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* storage unavailable */
    }
  });

  /* ---------- Highlight the current section in the nav ---------- */
  const links = new Map(
    [...nav.querySelectorAll('a[href^="#"]')].map((a) => [
      a.getAttribute("href").slice(1),
      a,
    ]),
  );
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.removeAttribute("aria-current"));
          links.get(entry.target.id)?.setAttribute("aria-current", "true");
        });
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    [...links.keys(), "top"].forEach((id) => {
      const el = $(id);
      if (el) spy.observe(el);
    });
  }

  /* ---------- Scroll reveal (content stays visible if this cannot run) ---------- */
  const revealEls = [...document.querySelectorAll(".reveal")];
  const showAll = () => revealEls.forEach((el) => el.classList.add("in"));
  if (!("IntersectionObserver" in window) || reduceMotion) {
    showAll();
  } else {
    // Stagger siblings that enter together
    const seen = new Map();
    revealEls.forEach((el) => {
      const n = seen.get(el.parentElement) ?? 0;
      el.style.setProperty("--i", Math.min(n, 5));
      seen.set(el.parentElement, n + 1);
    });
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          // Reveal what is on screen, and anything already scrolled past (fast scrolling, anchor jumps)
          if (!entry.isIntersecting && entry.boundingClientRect.top >= 0)
            return;
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));

    // Safety net: never leave content hidden if an observer callback is missed
    let sweeping = false;
    const sweep = () => {
      sweeping = false;
      revealEls.forEach((el) => {
        if (
          !el.classList.contains("in") &&
          el.getBoundingClientRect().top < window.innerHeight * 0.92
        ) {
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    };
    const queueSweep = () => {
      if (!sweeping) {
        sweeping = true;
        requestAnimationFrame(sweep);
      }
    };
    window.addEventListener("scroll", queueSweep, { passive: true });
    window.addEventListener("resize", queueSweep);
    queueSweep();
  }

  /* ---------- Card spotlight follows the pointer ---------- */
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target.closest?.(".card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      },
      { passive: true },
    );
  }

  /* ---------- Photo: hide a missing image so the monogram shows instead ---------- */
  const photo = document.querySelector(".avatar img");
  if (photo) {
    const hide = () => {
      photo.hidden = true;
    };
    photo.addEventListener("error", hide);
    if (photo.complete && photo.naturalWidth === 0) hide();
  }

  /* ---------- Interactive account-rule demo ---------- */
  const pillStd = $("pill-std"),
    pillAdm = $("pill-adm"),
    rowAdm = $("acc-adm");
  const btnDisable = $("btn-disable"),
    btnRun = $("btn-run"),
    btnReset = $("btn-reset");
  const msg = $("demo-msg"),
    log = $("log");
  let stdEnabled = true,
    admEnabled = true;

  const setPill = (el, cls, text) => {
    el.className = `pill ${cls}`;
    el.textContent = text;
  };
  const clock = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const addLog = (text) => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = clock();
    const span = document.createElement("span");
    span.textContent = text;
    li.append(time, span);
    log.prepend(li);
    while (log.children.length > 6) log.lastElementChild.remove();
  };

  const render = (message) => {
    setPill(
      pillStd,
      stdEnabled ? "ok" : "bad",
      stdEnabled ? "Enabled" : "Disabled",
    );
    if (!admEnabled) setPill(pillAdm, "bad", "Disabled");
    else if (!stdEnabled) setPill(pillAdm, "warn", "Still enabled");
    else setPill(pillAdm, "ok", "Enabled");

    rowAdm.classList.toggle("flag", admEnabled && !stdEnabled);
    btnDisable.disabled = !stdEnabled;
    btnRun.disabled = stdEnabled || !admEnabled;
    btnReset.disabled = stdEnabled && admEnabled;
    if (message) msg.textContent = message;
  };

  btnDisable.addEventListener("click", () => {
    stdEnabled = false;
    addLog("sam.example was disabled.");
    render(
      "The standard account is disabled, but the administrative account is still enabled. Until the weekly job runs, that privileged access is left behind with no owner.",
    );
  });
  btnRun.addEventListener("click", () => {
    admEnabled = false;
    addLog(
      "Weekly job: sam.example is disabled, so admin.sam.example was disabled.",
    );
    render(
      "The weekly job ran. It mapped the disabled standard account to its administrative account and disabled that too.",
    );
  });
  btnReset.addEventListener("click", () => {
    stdEnabled = true;
    admEnabled = true;
    addLog("Sample data reset.");
    render(
      "Both accounts are enabled. Disable the standard account to see what happens next.",
    );
  });
  addLog("Directory loaded with 2 sample accounts.");
  render();

  /* ---------- Contact form: opens the visitor's email app with the message filled in ---------- */
  $("compose").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name")).trim();
    const message = String(data.get("message")).trim();
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n${name}`);
    window.location.href = `mailto:rihamahamed.ar@gmail.com?subject=${subject}&body=${body}`;
  });

  const composeForm = document.getElementById("compose");
  const sendBtn = document.getElementById("send-btn");
  const formStatus = document.getElementById("form-status");

  if (composeForm) {
    composeForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      formStatus.textContent = "Sending your message...";

      const templateParams = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        message: document.getElementById("message").value,
      };

      try {
        await emailjs.send(
          "service_2foa86i",
          "template_2r5v3z3",
          templateParams,
        );

        formStatus.textContent =
          "Message sent successfully. Thank you for contacting me!";

        composeForm.reset();
      } catch (error) {
        console.error("EmailJS Error:", error);

        formStatus.textContent =
          "Sorry, your message could not be sent. Please try again.";
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send Message";
      }
    });
  }
})();
