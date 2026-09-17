/**
 * donation-cart.js
 * Handles the Donation Campaign (Cart Page) Theme App Block.
 *
 * Responsibilities:
 *  1. Fetch active campaigns from the Donation App backend.
 *  2. Read the current Shopify cart to detect any existing donation line item.
 *  3. Render a compact donation widget:
 *       - If NO donation in cart  → show amount picker + "Add Donation" button.
 *       - If donation IS in cart  → show current donation amount + "Update" and
 *         "Remove" buttons.
 *  4. All cart mutations use the Shopify AJAX Cart API.
 */

(function () {
  "use strict";

  /* ─── Utilities ──────────────────────────────────────────────────────────── */

  function formatCurrency(amount, currencyIso = "USD") {
    const num = parseFloat(amount);
    if (isNaN(num)) return String(amount);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyIso }).format(num);
    } catch (e) {
      return currencyIso + " " + num.toFixed(2);
    }
  }

  function resolveApiUrl(container) {
    return "/apps/smart-donate-enhancement/api/campaigns";
  }

  function setFeedback(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.className =
      "donation-cart-block__feedback" + (isError ? " error" : "");
  }

  /**
   * Check if a cart item is a donation line item (not a real product).
   */
  function isDonationLineItem(item) {
    return (
      item.properties &&
      (item.properties["Donation Campaign"] ||
        item.properties["_donation"] === "true")
    );
  }

  /**
   * Returns true if the cart has at least one real (non-donation) item.
   */
  function hasRealCartItems(cart) {
    if (!cart || !cart.items || cart.items.length === 0) return false;
    return cart.items.some(function (item) {
      return !isDonationLineItem(item);
    });
  }

  /* ─── Shopify Cart API helpers ───────────────────────────────────────────── */

  async function getCart() {
    const cartEndpoint = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart.js";
    const r = await fetch(cartEndpoint, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Cart fetch failed");
    return r.json();
  }

  async function cartAdd(variantId, quantity, properties) {
    const numericId = variantId.includes("/")
      ? variantId.split("/").pop()
      : variantId;
    const cartEndpoint = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart/add.js";

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [500, 1000, 2000]; // ms

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Back-off before retries (not before the first attempt)
      if (attempt > 0) {
        await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt - 1] || 2000));
      }

      let formData = new FormData();
      formData.append('id', numericId);
      formData.append('quantity', quantity);
      if (properties) {
        for (const [k, v] of Object.entries(properties)) {
          formData.append('properties[' + k + ']', v);
        }
      }

      const r = await fetch(cartEndpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: formData,
      });

      // 409 = cart locked by concurrent request → retry
      if (r.status === 409 && attempt < MAX_RETRIES) {
        console.warn(`[DonationCart] 409 Conflict on cartAdd (attempt ${attempt + 1}), retrying…`);
        continue;
      }

      if (!r.ok) {
        const text = await r.text().catch(() => "Unknown error");
        let errStr = "Cart add failed";
        try {
          const json = JSON.parse(text);
          errStr = json.description || json.message || ("Cart add failed. JSON: " + JSON.stringify(json));
        } catch (e) {
          errStr = "Cart add failed. Response: " + text.substring(0, 100);
        }
        throw new Error(errStr);
      }

      return r.json();
    }
  }

  async function cartUpdate(updates) {
    const cartEndpoint = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart/update.js";
    let formData = new FormData();
    for (const [k, v] of Object.entries(updates)) {
      formData.append('updates[' + k + ']', v);
    }

    const r = await fetch(cartEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: formData,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "Unknown error");
      throw new Error("Cart update failed: " + text.substring(0, 200));
    }
    return r.json();
  }

  async function cartChange(idOrKey, quantity, properties) {
    const numericId = String(idOrKey).includes("/")
      ? String(idOrKey).split("/").pop()
      : idOrKey;
    const cartEndpoint = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart/change.js";

    let formData = new FormData();
    formData.append('id', numericId);
    formData.append('quantity', quantity);

    if (properties && Object.keys(properties).length > 0) {
      for (const [k, v] of Object.entries(properties)) {
        formData.append('properties[' + k + ']', v);
      }
    }

    const r = await fetch(cartEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: formData,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "Unknown error");
      let errStr = "Cart change failed";
      try {
        const json = JSON.parse(text);
        errStr = json.description || json.message || ("Cart change failed. JSON: " + JSON.stringify(json));
      } catch (e) {
        errStr = "Cart change failed. Response: " + text.substring(0, 100);
      }
      throw new Error(errStr);
    }
    return r.json();
  }

  /**
   * Add a variant to the cart via a native HTML form POST to /cart/add.
   * This completely avoids the AJAX cart lock (409 Conflict) caused by
   * concurrent theme JavaScript cart operations.
   * @param {string} numericVariantId  Numeric Shopify variant ID
   * @param {number} quantity
   * @param {Object} properties  Line item properties key→value
   * @param {string} [returnTo]  Where Shopify redirects after add (default: /cart)
   * @param {string} [sellingPlanId]  Optional Shopify selling plan ID for subscriptions
   */
  function cartAddViaForm(numericVariantId, quantity, properties, returnTo, sellingPlanId) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart/add";
    form.style.display = "none";

    const append = (name, value) => {
      const el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      el.value = value;
      form.appendChild(el);
    };

    append("id", numericVariantId);
    append("quantity", String(quantity));
    if (sellingPlanId) {
      // Shopify /cart/add requires selling_plan as a plain integer, not a GID string.
      // e.g. "gid://shopify/SellingPlan/703440650524" → "703440650524"
      const numericSellingPlanId = String(sellingPlanId).includes("/")
        ? String(sellingPlanId).split("/").pop()
        : String(sellingPlanId);
      append("selling_plan", numericSellingPlanId);
    }
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        append(`properties[${k}]`, v);
      }
    }
    append("return_to", returnTo || "/cart");

    document.body.appendChild(form);
    form.submit();
  }

  /* ─── Find donation line in cart ─────────────────────────────────────────── */

  /**
   * Given a cart and a list of known donation variant numeric IDs,
   * return the first matching line item (or null).
   * @param {Object}   cart
   * @param {string[]} variantNumericIds
   * @returns {Object|null}
   */
  function findDonationLine(cart, variantNumericIds) {
    return (
      cart.items.find((item) =>
        variantNumericIds.includes(String(item.variant_id))
      ) || null
    );
  }

  /* ─── Fetch campaigns (with retry) ───────────────────────────────────────── */

  async function fetchCampaignsWithRetry(apiUrl, maxRetries) {
    const retries = maxRetries || 2;
    const delays = [1000, 2000, 3000];
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await new Promise(function (res) {
          setTimeout(res, delays[attempt - 1] || 2000);
        });
      }

      try {
        const r = await fetch(apiUrl, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const json = await r.json();
        return json;
      } catch (err) {
        lastError = err;
        console.warn("[DonationCart] Campaign fetch attempt " + (attempt + 1) + " failed:", err.message);
      }
    }

    throw lastError;
  }

  /* ─── Render ─────────────────────────────────────────────────────────────── */

  /**
   * Build and inject the cart donation widget.
   */
  async function renderWidget(container, campaignData) {
    const content = container.querySelector(".donation-cart-block__content");
    const allowCustom = container.dataset.allowCustom !== "false";
    const campaigns = campaignData.campaigns || [];
    const disabled = campaignData.disabled === true;
    // Recurring config from the API — contains monthlyPlanId / weeklyPlanId
    const recurringConfig = campaignData.recurringConfig || null;
    const currencyIso = container.dataset.currency || "USD";

    if (disabled || !campaigns.length) {
      container.style.display = "none";
      if (content) content.innerHTML = "";
      return;
    }

    let activeCampaign = campaigns[0];
    let selectedVariantId = null;
    let selectedAmount = null;
    let selectedSellingPlanId = null;

    /**
     * Full re-render of the widget for the active campaign.
     */
    async function renderCampaign() {
      const amounts = Array.isArray(activeCampaign.donationAmounts) ? activeCampaign.donationAmounts : JSON.parse(activeCampaign.donationAmounts || "[]");
      const variantIds = Array.isArray(activeCampaign.shopifyVariantIds) ? activeCampaign.shopifyVariantIds : JSON.parse(activeCampaign.shopifyVariantIds || "[]");

      // Build amount → variantId map
      const variantMap = {};
      amounts.forEach((amt, idx) => {
        variantMap[formatCurrency(amt, currencyIso)] = variantIds[idx] || null;
      });

      // Numeric variant IDs for cart line detection
      const numericVariantIds = variantIds.map((id) =>
        id.includes("/") ? id.split("/").pop() : id
      );

      // Read current cart
      let cart;
      let donationLine = null;
      try {
        cart = await getCart();
        donationLine = findDonationLine(cart, numericVariantIds);

        // Hide if cart has no real (non-donation) items
        const showOnEmptyCart = container.dataset.showOnEmptyCart === "true";
        if (!hasRealCartItems(cart) && !showOnEmptyCart) {
          container.style.display = "none";
          return;
        } else {
          container.style.display = "";
        }
      } catch (_) {
        // Non-fatal — render add mode
      }

      let html = "";

      /* Header (Campaign Selector) - outside the columns */
      if (campaigns.length > 1) {
        html +=
          '<div class="donation-cart-selector-wrap">' +
          '<label for="donation-cart-campaign-select" style="font-size:.82em;font-weight:600;display:block;margin-bottom:4px">Select Campaign</label>' +
          '<select id="donation-cart-campaign-select" class="donation-campaign-select">' +
          campaigns
            .map(
              (c) =>
                `<option value="${c.id}" ${c.id === activeCampaign.id ? "selected" : ""}>${c.name}</option>`
            )
            .join("") +
          "</select></div>";
      }

      html += '<div class="donation-cart-layout-wrap">';

      if (activeCampaign.imageUrl) {
        html += `<div class="donation-cart-image-col">
          <img src="${activeCampaign.imageUrl}" alt="Campaign Image" class="donation-cart-main-img"/>
        </div>`;
      }

      html += '<div class="donation-cart-info-col">';
      html += `<div class="donation-cart-block__header"><p class="donation-cart-block__title">${activeCampaign.name}</p></div>`;

      if (activeCampaign.description) {
        html += `<p class="donation-cart-block__description">${activeCampaign.description}</p>`;
      }

      /* Show current donation if in cart */
      if (donationLine) {
        const linePrice = formatCurrency(donationLine.price / 100, currencyIso);
        html += `<div class="donation-cart-block__current">✓ Donation in cart: <strong>${linePrice}</strong></div>`;
      }

      /* Amount rendering based on displayStyle */
      const style = activeCampaign.displayStyle || "tabs";

      if (style === "radio_button") {
        html += '<div class="donation-cart-block__radio" style="margin-bottom:12px; display:flex; flex-direction:column; gap:6px;">';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt, currencyIso);
          const isSelected = donationLine && Math.abs(donationLine.price / 100 - parseFloat(amt)) < 0.01 ? "checked" : "";
          html += `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="radio" name="donation_amount_${container.dataset.blockId}" class="donation-cart-amount-radio" data-amount="${label}" data-variant="${variantMap[label] || ""}" ${isSelected}/>${label}</label>`;
        });
        html += '</div>';
      } else if (style === "dropdown") {
        html += '<select class="donation-cart-amount-dropdown" style="width:100%; padding:8px 12px; margin-bottom:12px; border-radius:6px; border:1px solid #d0d0d0; font-size: 0.95em;">';
        html += '<option value="" disabled ' + (!donationLine ? "selected" : "") + '>Select an amount</option>';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt, currencyIso);
          const isSelected = donationLine && Math.abs(donationLine.price / 100 - parseFloat(amt)) < 0.01 ? "selected" : "";
          html += `<option value="${label}" data-variant="${variantMap[label] || ""}" ${isSelected}>${label}</option>`;
        });
        html += '</select>';
      } else {
        html += '<div class="donation-cart-block__amounts">';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt, currencyIso);
          const isSelected = donationLine && Math.abs(donationLine.price / 100 - parseFloat(amt)) < 0.01 ? "selected" : "";
          html += `<button type="button" class="donation-cart-amount-btn ${isSelected}" data-amount="${label}" data-variant="${variantMap[label] || ""}">${label}</button>`;
        });
        html += "</div>";
      }

      /* Custom amount */
      if (allowCustom && activeCampaign.allowOtherAmount) {
        html +=
          '<div class="donation-cart-custom-row">' +
          '<span style="font-size:.88em;font-weight:500">' +
          (activeCampaign.otherAmountTitle || "Other") +
          ":</span>" +
          `<input type="number" min="0.01" step="0.01" placeholder="0.00" class="donation-cart-custom-input" id="donation-cart-custom-${container.dataset.blockId}" />` +
          "</div>";
      }

      /* Action buttons */
      html += '<div class="donation-cart-action-row">';
      if (donationLine) {
        html +=
          '<button type="button" class="donation-cart-add-btn" disabled>Update Donation</button>' +
          '<button type="button" class="donation-cart-remove-btn">Remove</button>';
      } else {
        html +=
          '<button type="button" class="donation-cart-add-btn" disabled>Add Donation</button>';
      }
      html += "</div>";

      /* ── Recurring frequency selector (if campaign supports it) ── */
      if (activeCampaign.isRecurringEnabled && recurringConfig) {
        html += '<div class="donation-cart-recurring-row" style="margin-top:16px; padding-top:16px; border-top:1px dashed #e1e3e5;">';
        html += '<label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#1a1c1d; cursor:pointer;">';
        html += '<input type="checkbox" class="donation-cart-recurring-toggle" style="accent-color:#008060; width:16px; height:16px;" />';
        html += 'Make this a recurring donation';
        html += '</label>';
        html += '<div class="donation-cart-frequency-select" style="display:none; margin-top:10px;">';
        html += '<select class="donation-cart-freq-dropdown" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #d0d0d0; font-size:14px; font-weight:600;">';
        if (recurringConfig.monthlyPlanId) {
          html += '<option value="' + recurringConfig.monthlyPlanId + '">Monthly</option>';
        }
        if (recurringConfig.weeklyPlanId) {
          html += '<option value="' + recurringConfig.weeklyPlanId + '">Weekly</option>';
        }
        html += '</select>';
        html += '<p class="donation-cart-recurring-details-text" style="font-size: 11px; margin-top: 8px; color: #5c5f62; line-height: 1.4; font-weight: 500; display: none;"></p>';
        html += '</div></div>';
      }

      html += "</div>"; // end info-col
      html += "</div>"; // end layout-wrap

      /* Feedback */
      html += '<div class="donation-cart-block__feedback" aria-live="polite"></div>';

      /* Galaxy Branding for Basic Plan */
      if (campaignData.showBranding) {
        html += '<div class="donation-cart-branding" style="' +
          'margin-top:16px;padding-top:12px;border-top:1px solid #f0f1f2;' +
          'text-align:center;font-size:11px;color:#9ca3af;' +
          'font-family:-apple-system,BlinkMacSystemFont,Inter,Segoe UI,Roboto,sans-serif;' +
          'display:flex;align-items:center;justify-content:center;gap:4px;' +
          '">' +
          'Powered by <a href="https://www.galaxyweblinks.com/" target="_blank" rel="noopener" ' +
          'style="color:#6C4A79;text-decoration:none;font-weight:600;">' +
          'Galaxy Weblinks Inc.</a>' +
          '</div>';

        if (container.brandingIntervalId) {
          clearInterval(container.brandingIntervalId);
        }

        container.brandingIntervalId = setInterval(async () => {
          try {
            const r = await fetch("/apps/smart-donate-enhancement/api/plan-status?t=" + Date.now());
            if (r.ok) {
              const d = await r.json();
              if (d && !d.showBranding) {
                const brandingEls = container.querySelectorAll(".donation-cart-branding");
                brandingEls.forEach(el => el.style.display = "none");
                clearInterval(container.brandingIntervalId);
                container.brandingIntervalId = null;
              }
            }
          } catch (e) {
            console.error("Branding check failed", e);
          }
        }, 5000);
      }

      content.innerHTML = html;
      content.style.display = "";

      /* ── Wire events ── */

      const addBtn = content.querySelector(".donation-cart-add-btn");
      const removeBtn = content.querySelector(".donation-cart-remove-btn");
      const feedback = content.querySelector(".donation-cart-block__feedback");
      const customInput = content.querySelector(".donation-cart-custom-input");

      /* Campaign selector */
      const campaignSelect = content.querySelector(
        "#donation-cart-campaign-select"
      );
      if (campaignSelect) {
        campaignSelect.addEventListener("change", (e) => {
          activeCampaign = campaigns.find((c) => c.id === e.target.value);
          selectedVariantId = null;
          selectedAmount = null;
          selectedSellingPlanId = null;
          renderCampaign();
        });
      }

      /* Recurring toggle & frequency selector */
      const recurringToggle = content.querySelector(".donation-cart-recurring-toggle");
      const freqSelectWrap = content.querySelector(".donation-cart-frequency-select");
      const freqDropdown = content.querySelector(".donation-cart-freq-dropdown");

      function updateRecurringDetailsText() {
        const detailsEl = content.querySelector(".donation-cart-recurring-details-text");
        if (!detailsEl) return;
        
        if (recurringToggle && recurringToggle.checked) {
          const selectedOptionText = freqDropdown.options[freqDropdown.selectedIndex]?.text || '';
          const frequency = selectedOptionText.toLowerCase().includes('week') ? 'week' : 'month';
          const displayAmt = selectedAmount || "your chosen donation amount";
          detailsEl.textContent = 'You will be charged ' + displayAmt + ' today, and automatically every ' + frequency + ' thereafter. Cancel anytime.';
          detailsEl.style.display = "block";
        } else {
          detailsEl.style.display = "none";
        }
      }

      if (recurringToggle && freqSelectWrap && freqDropdown) {
        recurringToggle.addEventListener("change", () => {
          if (recurringToggle.checked) {
            freqSelectWrap.style.display = "block";
            selectedSellingPlanId = freqDropdown.value || null;
          } else {
            freqSelectWrap.style.display = "none";
            selectedSellingPlanId = null;
          }
          updateRecurringDetailsText();
        });
        freqDropdown.addEventListener("change", () => {
          if (recurringToggle.checked) {
            selectedSellingPlanId = freqDropdown.value || null;
          }
          updateRecurringDetailsText();
        });
      }

      /* Select Amount Helper */
      function applySelection(amt, variant, isCustomEvent = false) {
        selectedAmount = amt;
        selectedVariantId = variant;
        if (!isCustomEvent && customInput) customInput.value = "";
        addBtn.disabled = !selectedVariantId;
        setFeedback(feedback, "", false);
        updateRecurringDetailsText();
      }

      /* Amount button selection */
      content.querySelectorAll(".donation-cart-amount-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          content.querySelectorAll(".donation-cart-amount-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          // Clear radios & dropdown if mixed 
          content.querySelectorAll(".donation-cart-amount-radio").forEach(r => r.checked = false);
          if (content.querySelector(".donation-cart-amount-dropdown")) content.querySelector(".donation-cart-amount-dropdown").selectedIndex = 0;
          applySelection(btn.dataset.amount, btn.dataset.variant);
        });
      });

      /* Radio button selection */
      content.querySelectorAll(".donation-cart-amount-radio").forEach((radio) => {
        radio.addEventListener("change", () => {
          applySelection(radio.dataset.amount, radio.dataset.variant);
        });
      });

      /* Dropdown selection */
      const dropdown = content.querySelector(".donation-cart-amount-dropdown");
      if (dropdown) {
        dropdown.addEventListener("change", () => {
          const selectedOpt = dropdown.options[dropdown.selectedIndex];
          applySelection(selectedOpt.value, selectedOpt.dataset.variant);
        });
      }

      /* Custom input */
      // The $1.00 variant is always created as a placeholder for custom amounts.
      // We use the quantity trick: qty = Math.round(customAmount) with the $1.00
      // variant so that e.g. $34 custom shows as 34 × $1.00 = $34.00 in cart.
      const customPlaceholderVariantId = variantMap[formatCurrency(1.00, currencyIso)] || variantIds[0] || null;

      if (customInput) {
        customInput.addEventListener("input", () => {
          const val = parseFloat(customInput.value);
          if (!isNaN(val) && val > 0) {
            content.querySelectorAll(".donation-cart-amount-btn").forEach((b) => b.classList.remove("selected"));
            content.querySelectorAll(".donation-cart-amount-radio").forEach(r => r.checked = false);
            if (dropdown) dropdown.selectedIndex = 0;

            selectedAmount = formatCurrency(val, currencyIso);
            selectedVariantId = customPlaceholderVariantId;
            addBtn.disabled = !selectedVariantId;
          } else {
            selectedVariantId = null;
            addBtn.disabled = true;
          }
          updateRecurringDetailsText();
        });
      }

      /* Add / Update */
      addBtn.addEventListener("click", async () => {
        if (!selectedVariantId) return;
        addBtn.disabled = true;
        addBtn.textContent = donationLine ? "Updating…" : "Adding…";

        const isCustom = customInput && parseFloat(customInput.value) > 0;
        const customVal = isCustom ? parseFloat(customInput.value) : 0;

        const properties = {
          "Donation Campaign": activeCampaign.name,
          "_Donation Amount": isCustom ? formatCurrency(customVal, currencyIso) : selectedAmount,
        };
        if (isCustom) properties["Custom Amount"] = "true";

        // If a recurring selling plan is selected, tag it in properties too
        // (the native selling_plan param is passed separately to cartAddViaForm)
        if (selectedSellingPlanId) {
          properties["_selling_plan_id"] = selectedSellingPlanId;
        }

        // ── Both custom and preset amounts: form POST to cart (bypasses AJAX cart lock / 409) ────
        const numericId = String(selectedVariantId).includes("/")
          ? String(selectedVariantId).split("/").pop()
          : selectedVariantId;

        // For custom amounts use the quantity trick:
        //   quantity = Math.round(customAmount)  ×  $1.00 variant  = correct total
        // e.g. $34 custom → qty 34 × $1.00 = $34.00 shown in cart.
        const quantity = isCustom ? Math.max(1, Math.round(customVal)) : 1;

        if (donationLine) {
          // Step 1: remove existing donation via AJAX
          try {
            const removalUpdates = {};
            removalUpdates[donationLine.key || String(donationLine.variant_id)] = 0;
            await cartUpdate(removalUpdates);
            // Brief pause so Shopify processes the removal before the form POST
            await new Promise(r => setTimeout(r, 800));
          } catch (removeErr) {
            console.warn("[DonationCart] Remove failed (non-fatal, proceeding with add):", removeErr);
          }
        }

        // Step 2: add via form POST — no 409 possible
        // Pass selectedSellingPlanId so Shopify creates a native SubscriptionContract
        setFeedback(feedback, donationLine ? "✓ Updating donation…" : "✓ Adding donation…", false);
        cartAddViaForm(numericId, quantity, properties, "/cart", selectedSellingPlanId);
      });

      /* Remove */
      if (removeBtn) {
        removeBtn.addEventListener("click", async () => {
          removeBtn.disabled = true;
          try {
            const removalUpdates = {};
            removalUpdates[donationLine.key || String(donationLine.variant_id)] = 0;
            await cartUpdate(removalUpdates);
            setFeedback(feedback, "✓ Donation removed! Refreshing...", false);
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            setFeedback(feedback, `Failed to remove: ${err.message}`, true);
            removeBtn.disabled = false;
          }
        });
      }
    }

    await renderCampaign();
  }

  /* ─── Bootstrap ──────────────────────────────────────────────────────────── */

  async function init() {
    const containers = document.querySelectorAll(".donation-cart-block");
    if (!containers.length) return;

    for (const container of containers) {
      const loadingEl = container.querySelector(".donation-cart-block__loading");
      const errorEl = container.querySelector(".donation-cart-block__error");
      const apiUrl = resolveApiUrl(container);

      try {
        // Early empty-cart check: hide immediately if no real items in cart
        const cart = await getCart();
        const showOnEmptyCart = container.dataset.showOnEmptyCart === "true";
        if (!hasRealCartItems(cart) && !showOnEmptyCart) {
          container.style.display = "none";
          if (loadingEl) loadingEl.style.display = "none";
          continue;
        }

        const campaigns = await fetchCampaignsWithRetry(apiUrl, 2);
        if (loadingEl) loadingEl.style.display = "none";
        await renderWidget(container, campaigns);
      } catch (err) {
        console.error("[DonationCartBlock] Error after retries:", err);
        // Gracefully hide the block instead of showing a scary error
        if (loadingEl) loadingEl.style.display = "none";
        container.style.display = "none";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
