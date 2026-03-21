(function () {
  var script = document.currentScript;
  var apiKey = script.getAttribute("data-api-key") || "";
  var externalId = script.getAttribute("data-external-id") || "";
  var position = script.getAttribute("data-position") || "right";
  var primaryColor = script.getAttribute("data-primary-color") || "#7C3AED";
  var buttonShape = script.getAttribute("data-button-shape") || "circle";
  var companyName = script.getAttribute("data-company-name") || "Suporte";
  var baseUrl = script.src.replace(/\/nps-chat-embed\.js.*$/, "");
  var supabaseUrl = "https://ydnblcgygkbqioowbnhz.supabase.co";

  var resolvedToken = null;
  var resolvedName = null;
  var resolvedEmail = null;
  var resolvedOwnerUserId = null;
  var resolvedCompanyContactId = null;
  var resolvedContactId = null;
  var resolvedAutoStart = false;
  var resolvedNeedsForm = false;
  var resolvedHasHistory = false;

  var fieldDefinitions = [];
  var widgetSettings = {};
  var visitorProps = {};
  var chatIframe = null;

  var resolverReady = false;
  var pendingUpdates = [];

  var RESERVED_KEYS = ["name", "email", "phone", "company_id", "company_name", "user_id"];

  function camelToSnake(str) {
    return str.replace(/([A-Z])/g, function (match) {
      return "_" + match.toLowerCase();
    });
  }

  function normalizeKeys(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    var result = {};
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      var snakeKey = camelToSnake(key);
      result[snakeKey] = obj[key];
    }
    return result;
  }

  // --- Banner Type SVG Icons ---
  var BANNER_ICONS = {
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    success:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    promo:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    update:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
  };

  // Colors are now read directly from banner.bg_color and banner.text_color (database source of truth)

  // --- Banner Logic ---
  var bannerContainer = null;

  function createBannerContainer() {
    bannerContainer = document.createElement("div");
    bannerContainer.id = "nps-banners-container";
    bannerContainer.style.cssText =
      "position:fixed;top:0;left:0;width:100%;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
    document.body.appendChild(bannerContainer);
  }

  var BORDER_CSS = {
    none: "",
    subtle: "border-bottom:1px solid rgba(255,255,255,0.15);",
    rounded: "border-radius:0 0 12px 12px;",
    pill: "margin:8px 16px;border-radius:24px;",
  };
  var SHADOW_CSS = {
    none: "",
    soft: "box-shadow:0 2px 8px rgba(0,0,0,0.08);",
    medium: "box-shadow:0 4px 16px rgba(0,0,0,0.12);",
    strong: "box-shadow:0 8px 32px rgba(0,0,0,0.18);",
  };

  function renderBanner(banner) {
    var div = document.createElement("div");
    div.setAttribute("data-assignment-id", banner.assignment_id);

    var borderCss = BORDER_CSS[banner.border_style] || "";
    var shadowCss = SHADOW_CSS[banner.shadow_style] || "";

    // Use bg_color and text_color directly from database
    var useBg = banner.bg_color || "#3B82F6";
    var useText = banner.text_color || "#FFFFFF";

    div.style.cssText =
      "padding:12px 48px 12px 20px;font-size:14px;font-weight:500;letter-spacing:0.01em;line-height:1.5;" +
      "position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" +
      "overflow:hidden;box-sizing:border-box;max-width:100vw;border-radius:16px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);" +
      (useBg.indexOf("linear-gradient") === 0 ? "background:" : "background-color:") +
      useBg +
      ";color:" +
      useText +
      ";" +
      "transform:translateY(-100%);transition:transform 0.3s ease;" +
      borderCss +
      shadowCss;

    // Decorative geometric shapes
    if (banner.has_decorations) {
      div.style.overflow = "visible";
      var decoLeft1 = document.createElement("div");
      decoLeft1.innerHTML =
        '<svg style="position:absolute;left:-20px;top:-16px;pointer-events:none;opacity:0.12" width="72" height="72" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="36" fill="' +
        useText +
        '"/></svg>';
      div.appendChild(decoLeft1.firstChild);

      var decoLeft2 = document.createElement("div");
      decoLeft2.innerHTML =
        '<svg style="position:absolute;left:12px;bottom:-12px;pointer-events:none;opacity:0.08" width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="' +
        useText +
        '"/></svg>';
      div.appendChild(decoLeft2.firstChild);

      var decoRight1 = document.createElement("div");
      decoRight1.innerHTML =
        '<svg style="position:absolute;right:-12px;top:-20px;pointer-events:none;opacity:0.10" width="20" height="52" viewBox="0 0 20 52" fill="none"><rect x="0" y="0" width="20" height="52" rx="6" fill="' +
        useText +
        '"/></svg>';
      div.appendChild(decoRight1.firstChild);

      var decoRight2 = document.createElement("div");
      decoRight2.innerHTML =
        '<svg style="position:absolute;right:20px;top:-12px;pointer-events:none;opacity:0.07" width="14" height="36" viewBox="0 0 14 36" fill="none"><rect x="0" y="0" width="14" height="36" rx="4" fill="' +
        useText +
        '"/></svg>';
      div.appendChild(decoRight2.firstChild);

      var decoDot = document.createElement("div");
      decoDot.innerHTML =
        '<svg style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);pointer-events:none;opacity:0.15" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="' +
        useText +
        '"/></svg>';
      div.appendChild(decoDot.firstChild);
    }

    // Animate in
    setTimeout(function () {
      div.style.transform = "translateY(0)";
    }, 10);

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText =
      "position:absolute;top:10px;right:12px;background:none;border:none;cursor:pointer;color:" +
      useText +
      ";font-size:14px;padding:4px 6px;border-radius:50%;opacity:0.6;";
    closeBtn.onmouseover = function () {
      closeBtn.style.opacity = "1";
    };
    closeBtn.onmouseout = function () {
      closeBtn.style.opacity = "0.7";
    };
    closeBtn.onclick = function () {
      div.style.transform = "translateY(-100%)";
      setTimeout(function () {
        dismissBanner(banner.assignment_id);
        div.remove();
        if (bannerContainer && bannerContainer.children.length === 0) bannerContainer.remove();
      }, 300);
    };
    div.appendChild(closeBtn);

    // Content row
    var contentDiv = document.createElement("div");
    contentDiv.style.cssText =
      "display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;width:100%;max-width:80ch;overflow:hidden;min-width:0;margin:0 auto;";

    var iconHtml = BANNER_ICONS[banner.banner_type || "info"] || BANNER_ICONS.info;
    var iconSpan = document.createElement("span");
    iconSpan.innerHTML = iconHtml;
    iconSpan.style.cssText = "flex-shrink:0;opacity:0.9;display:flex;align-items:center;";
    contentDiv.appendChild(iconSpan);

    var text = document.createElement("span");
    text.style.cssText =
      "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.5;word-break:break-word;overflow-wrap:break-word;min-width:0;max-width:80ch;";
    if (banner.content_html) {
      text.innerHTML = banner.content_html;
      var links = text.querySelectorAll("a");
      for (var li = 0; li < links.length; li++) {
        links[li].style.wordBreak = "break-all";
      }
    } else {
      text.textContent = banner.content;
    }
    contentDiv.appendChild(text);
    div.appendChild(contentDiv);

    // Actions row
    var hasActions = banner.link_url || banner.has_voting;
    if (hasActions) {
      var actions = document.createElement("div");
      actions.style.cssText = "display:flex;align-items:center;justify-content:center;gap:8px;";

      if (banner.link_url) {
        var link = document.createElement("a");
        link.href = banner.link_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = banner.link_label || "Saiba mais";
        link.style.cssText =
          "color:" + useText + ";text-decoration:underline;font-size:13px;font-weight:600;opacity:0.9;";
        actions.appendChild(link);
      }

      if (banner.has_voting) {
        var upBtn = document.createElement("button");
        upBtn.innerHTML = "👍";
        upBtn.title = "Like";
        upBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:4px;opacity:" +
          (banner.vote === "up" ? "1" : "0.6") +
          ";";
        upBtn.onclick = function () {
          voteBanner(banner.assignment_id, "up");
          upBtn.style.opacity = "1";
          downBtn.style.opacity = "0.6";
        };
        actions.appendChild(upBtn);

        var downBtn = document.createElement("button");
        downBtn.innerHTML = "👎";
        downBtn.title = "Dislike";
        downBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:4px;opacity:" +
          (banner.vote === "down" ? "1" : "0.6") +
          ";";
        downBtn.onclick = function () {
          voteBanner(banner.assignment_id, "down");
          downBtn.style.opacity = "1";
          upBtn.style.opacity = "0.6";
        };
        actions.appendChild(downBtn);
      }

      div.appendChild(actions);
    }

    // Auto-dismiss
    if (banner.auto_dismiss_seconds && banner.auto_dismiss_seconds > 0) {
      setTimeout(function () {
        div.style.transform = "translateY(-100%)";
        setTimeout(function () {
          div.remove();
          if (bannerContainer && bannerContainer.children.length === 0) bannerContainer.remove();
        }, 300);
      }, banner.auto_dismiss_seconds * 1000);
    }

    // Display frequency check
    var freqKey = "banner_freq_" + banner.assignment_id;
    if (banner.display_frequency === "once_per_session") {
      if (sessionStorage.getItem(freqKey)) return null;
      sessionStorage.setItem(freqKey, "1");
    } else if (banner.display_frequency === "once_per_day") {
      var lastShown = localStorage.getItem(freqKey);
      var today = new Date().toDateString();
      if (lastShown === today) return null;
      localStorage.setItem(freqKey, today);
    }

    return div;
  }

  function voteBanner(assignmentId, vote) {
    fetch(supabaseUrl + "/functions/v1/vote-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId, vote: vote }),
    }).catch(function () {});
  }

  function dismissBanner(assignmentId) {
    fetch(supabaseUrl + "/functions/v1/dismiss-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId }),
    }).catch(function () {});
  }

  function loadBanners() {
    var bannerUrl;
    if (apiKey && externalId) {
      bannerUrl =
        supabaseUrl +
        "/functions/v1/get-visitor-banners?api_key=" +
        encodeURIComponent(apiKey) +
        "&external_id=" +
        encodeURIComponent(externalId);
    } else {
      var token = resolvedToken || localStorage.getItem("chat_visitor_token");
      if (!token) return;
      bannerUrl = supabaseUrl + "/functions/v1/get-visitor-banners?visitor_token=" + encodeURIComponent(token);
    }

    fetch(bannerUrl)
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.banners && data.banners.length > 0) {
          createBannerContainer();
          var shown = 0;
          data.banners.forEach(function (banner) {
            if (banner.outbound_type === "page") {
              renderPageModal(banner);
              return;
            }
            if (shown >= 2) return;
            var el = renderBanner(banner);
            if (el) {
              bannerContainer.appendChild(el);
              shown++;
            }
          });
          if (bannerContainer && bannerContainer.children.length === 0) bannerContainer.remove();
        }
      })
      .catch(function () {});
  }

  function renderPageModal(banner) {
    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:100000;display:flex;align-items:center;justify-content:center;";

    var wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative;max-width:600px;width:90%;";

    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText =
      "position:absolute;top:-12px;right:-12px;width:32px;height:32px;background:rgba(0,0,0,0.5);border:none;cursor:pointer;font-size:14px;color:#fff;border-radius:50%;z-index:1;display:flex;align-items:center;justify-content:center;transition:background 0.2s;";
    closeBtn.onmouseenter = function () {
      closeBtn.style.background = "rgba(0,0,0,0.7)";
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.background = "rgba(0,0,0,0.5)";
    };
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      overlay.remove();
      dismissBanner(banner.assignment_id);
    };
    wrapper.appendChild(closeBtn);

    var img = document.createElement("img");
    img.src = banner.page_html || "";
    img.style.cssText =
      "max-width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);display:block;margin:0 auto;";
    if (banner.link_url) {
      img.style.cursor = "pointer";
      img.onclick = function (e) {
        e.stopPropagation();
        window.open(banner.link_url, "_blank");
        overlay.remove();
        dismissBanner(banner.assignment_id);
      };
    }
    wrapper.appendChild(img);

    overlay.appendChild(wrapper);
    overlay.onclick = function (e) {
      if (e.target === overlay) {
        overlay.remove();
        dismissBanner(banner.assignment_id);
      }
    };
    document.body.appendChild(overlay);
  }

  // --- Fetch dynamic widget config ---
  function fetchWidgetConfig(callback) {
    if (!apiKey) {
      callback();
      return;
    }

    fetch(supabaseUrl + "/functions/v1/get-widget-config?api_key=" + encodeURIComponent(apiKey))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.fields) fieldDefinitions = data.fields;
        if (data.settings) {
          widgetSettings = data.settings;
          if (data.settings.company_name && !script.getAttribute("data-company-name")) {
            companyName = data.settings.company_name;
          }
          if (data.settings.primary_color && !script.getAttribute("data-primary-color")) {
            primaryColor = data.settings.primary_color;
          }
        }
        if (data.owner_user_id) resolvedOwnerUserId = data.owner_user_id;
        callback();
      })
      .catch(function () {
        callback();
      });
  }

  // --- Separate reserved vs custom data ---
  function buildResolverPayload(props) {
    var payload = { api_key: apiKey, external_id: externalId };
    var customData = {};

    var normalized = normalizeKeys(props);

    for (var key in normalized) {
      if (!normalized.hasOwnProperty(key)) continue;
      if (RESERVED_KEYS.indexOf(key) !== -1) {
        payload[key] = normalized[key];
      } else {
        customData[key] = normalized[key];
      }
    }

    if (Object.keys(customData).length > 0) {
      payload.custom_data = customData;
    }

    if (resolvedToken) {
      payload.visitor_token = resolvedToken;
    } else {
      var savedToken = localStorage.getItem("chat_visitor_token");
      if (savedToken) payload.visitor_token = savedToken;
    }

    return payload;
  }

  function sendResolverUpdate(props) {
    if (!apiKey) return;
    var payload = buildResolverPayload(props);
    fetch(supabaseUrl + "/functions/v1/resolve-chat-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function (err) {
      console.warn("[NPSChat] update failed:", err);
    });
  }

  function processPendingUpdates() {
    if (pendingUpdates.length === 0) return;
    pendingUpdates = [];
    sendResolverUpdate(visitorProps);
  }

  function resolveVisitor(callback) {
    if (!apiKey) {
      resolverReady = true;
      callback();
      return;
    }

    var payload = buildResolverPayload(visitorProps);

    fetch(supabaseUrl + "/functions/v1/resolve-chat-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.visitor_token) {
          resolvedToken = data.visitor_token;
          resolvedName = data.visitor_name || "";
          resolvedEmail = data.visitor_email || "";
          if (resolvedName && !visitorProps.name) visitorProps.name = resolvedName;
          if (resolvedEmail && !visitorProps.email) visitorProps.email = resolvedEmail;
          resolvedOwnerUserId = data.user_id || resolvedOwnerUserId;
          resolvedCompanyContactId = data.company_contact_id || "";
          resolvedContactId = data.contact_id || "";
          resolvedAutoStart = !!data.auto_start;
          resolvedHasHistory = !!data.has_history;
          resolvedNeedsForm = false;
          localStorage.setItem("chat_visitor_token", data.visitor_token);
        } else {
          if (data.user_id) resolvedOwnerUserId = data.user_id;
          resolvedNeedsForm = !!data.needs_form;
          resolvedAutoStart = !!data.auto_start;
        }

        resolverReady = true;
        processPendingUpdates();
        callback();
      })
      .catch(function () {
        resolverReady = true;
        processPendingUpdates();
        callback();
      });
  }

  // --- Chat Widget Iframe ---
  function createChatWidget() {
    var iframe = document.createElement("iframe");
    var iframeSrc =
      baseUrl +
      "/widget?embed=true" +
      "&position=" +
      encodeURIComponent(position) +
      "&primaryColor=" +
      encodeURIComponent(primaryColor) +
      "&companyName=" +
      encodeURIComponent(companyName) +
      "&buttonShape=" +
      encodeURIComponent(buttonShape);

    if (resolvedToken) {
      iframeSrc +=
        "&visitorToken=" +
        encodeURIComponent(resolvedToken) +
        "&visitorName=" +
        encodeURIComponent(resolvedName || "") +
        "&ownerUserId=" +
        encodeURIComponent(resolvedOwnerUserId || "") +
        "&companyContactId=" +
        encodeURIComponent(resolvedCompanyContactId || "") +
        "&contactId=" +
        encodeURIComponent(resolvedContactId || "");
    }

    if (!resolvedToken && resolvedOwnerUserId) {
      iframeSrc += "&ownerUserId=" + encodeURIComponent(resolvedOwnerUserId);
    }

    if (apiKey) iframeSrc += "&apiKey=" + encodeURIComponent(apiKey);

    if (resolvedAutoStart) iframeSrc += "&autoStart=true";
    if (resolvedNeedsForm) iframeSrc += "&needsForm=true";
    if (resolvedHasHistory) iframeSrc += "&hasHistory=true";

    iframe.src = iframeSrc;
    iframe.style.cssText =
      "position:fixed;bottom:20px;" +
      (position === "left" ? "left:20px" : "right:20px") +
      ";width:80px;height:80px;border:none;z-index:999;background:transparent;";
    iframe.allow = "clipboard-write";
    document.body.appendChild(iframe);
    chatIframe = iframe;

    var widgetIsOpen = false;

    function recalcHeight() {
      if (widgetIsOpen) {
        var maxH = Math.min(700, window.innerHeight - 16);
        iframe.style.height = maxH + "px";
      }
    }

    window.addEventListener("resize", recalcHeight);

    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "chat-toggle") {
        widgetIsOpen = event.data.isOpen;
        if (event.data.isOpen) {
          iframe.style.width = "420px";
          var maxH = Math.min(700, window.innerHeight - 16);
          iframe.style.height = maxH + "px";
          iframe.style.bottom = "0";
          iframe.style[position === "left" ? "left" : "right"] = "0";
        } else {
          iframe.style.width = "80px";
          iframe.style.height = "80px";
          iframe.style.bottom = "20px";
          iframe.style[position === "left" ? "left" : "right"] = "20px";
        }
      }
    });
  }

  // --- Public API: window.NPSChat ---
  window.NPSChat = {
    update: function (props) {
      if (!props || typeof props !== "object") return;

      for (var key in props) {
        if (props.hasOwnProperty(key)) {
          visitorProps[key] = props[key];
        }
      }

      if (chatIframe && chatIframe.contentWindow) {
        chatIframe.contentWindow.postMessage({ type: "nps-chat-update", props: visitorProps }, "*");
      }

      if (!resolverReady) {
        pendingUpdates.push(props);
        return;
      }

      sendResolverUpdate(visitorProps);
    },
  };

  // Init
  function init() {
    fetchWidgetConfig(function () {
      resolveVisitor(function () {
        loadBanners();
        createChatWidget();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
