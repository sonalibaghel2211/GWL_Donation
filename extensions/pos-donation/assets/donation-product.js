/**
 * donation-product.js
 * Handles the Donation Campaign (Product Page) Theme App Block.
 *
 * Responsibilities:
 *  1. Locate all product donation block containers on page load.
 *  2. Fetch active campaigns from the Donation App API.
 *  3. Render campaign selector (if >1 campaign), donation amounts, optional
 *     custom amount input, and an "Add Donation to Cart" button.
 *  4. On button click – add the chosen donation variant to the Shopify cart
 *     via the AJAX Cart API (/cart/add.js).
 */

(function () {
  "use strict";

  /* ─── Utilities ──────────────────────────────────────────────────────────── */

  /**
   * Format cents-or-decimal amount as a currency string.
   * @param {number|string} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return "$" + num.toFixed(2);
  }

  /**
   * Resolve the campaigns API URL from the block's data attribute.
   * Falls back to Shopify app proxy path `/apps/donations/api/campaigns`.
   * @param {HTMLElement} container
   * @returns {string}
   */
  function resolveApiUrl(container) {
    const base = (container.dataset.apiUrl || "").replace(/\/$/, "");
    return base
      ? base + "/api/campaigns"
      : "/apps/pos-donation/api/campaigns";
  }

  /* ─── Fetch campaigns ─────────────────────────────────────────────────────── */

  /**
   * Fetch active campaigns from the Donation App backend.
   * @param {string} apiUrl
   * @returns {Promise<Array>}
   */
  async function fetchCampaignData(apiUrl) {
    console.log("Donation Widget: Fetching from", apiUrl);
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });
    console.log("Donation Widget: API Status", response.status);
    if (!response.ok) throw new Error("HTTP " + response.status);
    const json = await response.json();
    console.log("Donation Widget: API Response", json);
    return {
      campaigns: json.campaigns || [],
      recurringConfig: json.recurringConfig || null
    };
  }

  /* ─── Render ─────────────────────────────────────────────────────────────── */

  /**
   * Build and inject the donation widget HTML into the given container.
   * @param {HTMLElement} container  The block root element
   * @param {Array}       campaigns  Array of campaign objects from API
   */
  function renderWidget(container, campaigns, recurringConfig) {
    const content = container.querySelector(".donation-product-block__content");
    console.log("Donation Widget: Rendering with", campaigns.length, "campaigns");
    if (!campaigns.length) {
      content.innerHTML =
        '<p style="color:#888;font-size:.9em">No active donation campaigns available.</p>';
      content.style.display = "";
      return;
    }

    /* State */
    let activeCampaign = campaigns[0];
    let selectedVariantId = null;
    let selectedAmount = null;
    let isRecurring = false;
    let selectedFrequency = "monthly"; // default

    /**
     * Re-render the widget for the currently active campaign.
     */
    function renderCampaign() {
      const amounts = Array.isArray(activeCampaign.donationAmounts) ? activeCampaign.donationAmounts : JSON.parse(activeCampaign.donationAmounts || "[]");
      const variantIds = Array.isArray(activeCampaign.shopifyVariantIds) ? activeCampaign.shopifyVariantIds : JSON.parse(activeCampaign.shopifyVariantIds || "[]");
      // Build a map: formatted price → variantId
      const variantMap = {};
      amounts.forEach((amt, idx) => {
        const formatted = formatCurrency(amt);
        variantMap[formatted] = variantIds[idx] || null;
      });

      let html = "";

      /* Title + image + description */
      if (campaigns.length > 1) {
        html += '<div class="donation-product-selector-wrap">';
        html += '<label for="donation-product-campaign-select" style="font-size:.85em;font-weight:600;display:block;margin-bottom:4px">Select Campaign</label>';
        html +=
          '<select id="donation-product-campaign-select" class="donation-campaign-select">' +
          campaigns
            .map(
              (c) =>
                `<option value="${c.id}" ${c.id === activeCampaign.id ? "selected" : ""}>${c.name}</option>`
            )
            .join("") +
          "</select></div>";
      }

      html += '<div class="donation-product-layout-wrap">';

      if (activeCampaign.imageUrl) {
        html += `<div class="donation-product-image-col">
          <img src="${activeCampaign.imageUrl}" alt="Campaign Image" class="donation-product-main-img"/>
        </div>`;
      }

      html += '<div class="donation-product-info-col">';
      html += `<p class="donation-product-block__title">${activeCampaign.name}</p>`;

      if (activeCampaign.description) {
        html += `<p class="donation-product-block__description">${activeCampaign.description}</p>`;
      }

      /* Recurring Toggle */
      if (activeCampaign.isRecurringEnabled && recurringConfig) {
        html += `
          <div class="donation-type-toggle" style="margin-bottom:16px;">
            <div style="display:flex; gap:16px;">
               <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:.9em;">
                 <input type="radio" name="donation_type_${container.dataset.blockId}" value="one_time" ${!isRecurring ? "checked" : ""}> One-time
               </label>
               <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:.9em;">
                 <input type="radio" name="donation_type_${container.dataset.blockId}" value="recurring" ${isRecurring ? "checked" : ""}> Recurring
               </label>
            </div>
            
            <div class="recurring-options" style="display: ${isRecurring ? "block" : "none"}; margin-top:12px; padding-top:12px; border-top:1px solid #efefef;">
               <label style="font-size:.85em; font-weight:600; display:block; margin-bottom:4px;">Frequency</label>
               <select class="donation-frequency-select" style="width:100%; padding:8px; border-radius:6px; border:1px solid #d0d0d0;">
                 <option value="monthly" ${selectedFrequency === "monthly" ? "selected" : ""}>Monthly</option>
                 <option value="weekly" ${selectedFrequency === "weekly" ? "selected" : ""}>Weekly</option>
               </select>
            </div>
          </div>
        `;
      }

      /* Amount rendering based on displayStyle */
      const style = activeCampaign.displayStyle || "tabs";

      if (style === "radio_button") {
        html += '<div class="donation-product-block__radio" style="margin-bottom:12px; display:flex; flex-direction:column; gap:6px;">';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt);
          const isSelected = label === selectedAmount ? "checked" : "";
          html += `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="radio" name="donation_amount_${container.dataset.blockId}" class="donation-amount-radio" data-amount="${label}" data-variant="${variantMap[label] || ""}" ${isSelected}/>${label}</label>`;
        });
        html += '</div>';
      } else if (style === "dropdown") {
        html += '<select class="donation-amount-dropdown" style="width:100%; padding:8px 12px; margin-bottom:12px; border-radius:6px; border:1px solid #d0d0d0; font-size: 0.95em;">';
        html += '<option value="" disabled ' + (!selectedAmount ? "selected" : "") + '>Select an amount</option>';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt);
          const isSelected = label === selectedAmount ? "selected" : "";
          html += `<option value="${label}" data-variant="${variantMap[label] || ""}" ${isSelected}>${label}</option>`;
        });
        html += '</select>';
      } else {
        html += '<div class="donation-product-block__amounts">';
        amounts.forEach((amt) => {
          const label = formatCurrency(amt);
          const isSelected = label === selectedAmount ? "selected" : "";
          html += `<button type="button" class="donation-amount-btn ${isSelected}" data-amount="${label}" data-variant="${variantMap[label] || ""}">${label}</button>`;
        });
        html += "</div>";
      }

      /* Custom amount (optional) */
      if (allowCustom && activeCampaign.allowOtherAmount) {
        html +=
          '<div class="donation-custom-row">' +
          '<span style="font-size:.9em;font-weight:500">' +
          (activeCampaign.otherAmountTitle || "Other") +
          ":</span>" +
          '<input type="number" min="0.01" step="0.01" placeholder="0.00" class="donation-custom-input" id="donation-custom-amount-' +
          container.dataset.blockId +
          '" />' +
          "</div>";
      }

      /* Add to cart button */
      html +=
        '<button type="button" class="donation-add-btn" disabled>Add Donation to Cart</button>';

      html += "</div>"; // end info-col
      html += "</div>"; // end layout-wrap

      /* Feedback area */
      html += '<div class="donation-product-block__feedback" aria-live="polite"></div>';

      content.innerHTML = html;
      content.style.display = "";

      /* ── Wire events ── */

      /* Campaign selector */
      const campaignSelect = content.querySelector(
        "#donation-product-campaign-select"
      );
      if (campaignSelect) {
        campaignSelect.addEventListener("change", (e) => {
          activeCampaign = campaigns.find((c) => c.id === e.target.value);
          selectedVariantId = null;
          selectedAmount = null;
          isRecurring = false;
          renderCampaign();
        });
      }

      /* Recurring toggle events */
      content.querySelectorAll(`input[name="donation_type_${container.dataset.blockId}"]`).forEach(radio => {
        radio.addEventListener("change", (e) => {
          isRecurring = e.target.value === "recurring";
          const recurringOpts = content.querySelector(".recurring-options");
          if (recurringOpts) recurringOpts.style.display = isRecurring ? "block" : "none";
        });
      });

      const freqSelect = content.querySelector(".donation-frequency-select");
      if (freqSelect) {
        freqSelect.addEventListener("change", (e) => {
          selectedFrequency = e.target.value;
        });
      }

      const addBtn = content.querySelector(".donation-add-btn");
      const feedback = content.querySelector(
        ".donation-product-block__feedback"
      );
      const customInput = content.querySelector(".donation-custom-input");

      /* Select Amount Helper */
      function applySelection(amt, variant, isCustomEvent = false) {
        selectedAmount = amt;
        selectedVariantId = variant;
        if (!isCustomEvent && customInput) customInput.value = "";
        addBtn.disabled = !selectedVariantId;
        setFeedback(feedback, "", false);
      }

      /* Amount button selection */
      content.querySelectorAll(".donation-amount-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          content.querySelectorAll(".donation-amount-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          // Clear radios & dropdown if mixed 
          content.querySelectorAll(".donation-amount-radio").forEach(r => r.checked = false);
          if (content.querySelector(".donation-amount-dropdown")) content.querySelector(".donation-amount-dropdown").selectedIndex = 0;
          applySelection(btn.dataset.amount, btn.dataset.variant);
        });
      });

      /* Radio button selection */
      content.querySelectorAll(".donation-amount-radio").forEach((radio) => {
        radio.addEventListener("change", () => {
          applySelection(radio.dataset.amount, radio.dataset.variant);
        });
      });

      /* Dropdown selection */
      const dropdown = content.querySelector(".donation-amount-dropdown");
      if (dropdown) {
        dropdown.addEventListener("change", () => {
          const selectedOpt = dropdown.options[dropdown.selectedIndex];
          applySelection(selectedOpt.value, selectedOpt.dataset.variant);
        });
      }

      /* Custom amount input */
      if (customInput) {
        customInput.addEventListener("input", () => {
          const val = parseFloat(customInput.value);
          if (!isNaN(val) && val > 0) {
            content.querySelectorAll(".donation-amount-btn").forEach((b) => b.classList.remove("selected"));
            content.querySelectorAll(".donation-amount-radio").forEach(r => r.checked = false);
            if (dropdown) dropdown.selectedIndex = 0;

            selectedAmount = formatCurrency(val);
            selectedVariantId = variantIds[0] || null;
            addBtn.disabled = !selectedVariantId;
            setFeedback(feedback, "", false);
          } else {
            selectedVariantId = null;
            addBtn.disabled = true;
          }
        });
      }

      /* Add to cart */
      addBtn.addEventListener("click", async () => {
        if (!selectedVariantId) return;
        addBtn.disabled = true;
        addBtn.textContent = "Adding…";
        setFeedback(feedback, "", false);

        const isCustom = customInput && parseFloat(customInput.value) > 0;
        const properties = {
          "Donation Campaign": activeCampaign.name,
          "Donation Amount": isCustom
            ? formatCurrency(parseFloat(customInput.value))
            : selectedAmount,
        };
        if (isCustom) properties["Custom Amount"] = "true";
        if (isRecurring) {
          properties["Donation Type"] = "Recurring";
          properties["Frequency"] = selectedFrequency;
        }

        // ── Custom amount path: server-side Draft Order with price override ──
        if (isCustom) {
          const amount = parseInt(customInput.value);
          if (isNaN(amount) || amount <= 0) {
            setFeedback(feedback, "Please enter a valid whole amount.", true);
            addBtn.disabled = false;
            addBtn.textContent = "Add Donation to Cart";
            return;
          }

          // Try to find the $1.00 variant for this campaign
          // Variant price in activeCampaign.donationAmounts might be "$1.00" or similar
          // Let's use the variantMap which we built in renderCampaign()
          // Wait, variantMap is local to renderCampaign. I need to make it accessible or rebuild it.

          const amounts = Array.isArray(activeCampaign.donationAmounts) ? activeCampaign.donationAmounts : JSON.parse(activeCampaign.donationAmounts || "[]");
          const variantIds = Array.isArray(activeCampaign.shopifyVariantIds) ? activeCampaign.shopifyVariantIds : JSON.parse(activeCampaign.shopifyVariantIds || "[]");

          let unitVariantId = null;
          amounts.forEach((amt, idx) => {
            const val = parseFloat(amt);
            if (val >= 0.99 && val <= 1.01) {
              unitVariantId = variantIds[idx];
            }
          });

          if (unitVariantId) {
            const numericId = unitVariantId.includes("/") ? unitVariantId.split("/").pop() : unitVariantId;
            let sellingPlanId = null;
            if (isRecurring && recurringConfig) {
              sellingPlanId = selectedFrequency === "monthly" ? recurringConfig.monthlyPlanId : recurringConfig.weeklyPlanId;
            }

            setFeedback(feedback, "Adding to cart...", false);
            cartAddViaForm(numericId, amount, properties, "/cart", sellingPlanId);
            return;
          } else {
            console.warn("No $1.00 variant found for custom amount. Falling back to Draft Order.");
            // Keep the old Draft Order logic as a fallback for legacy campaigns
            try {
              const customAmountVal = parseFloat(customInput.value).toFixed(2);
              const proxyUrl = "/apps/pos-donation/api/custom-donation-cart";
              const body = {
                campaignId: activeCampaign.id,
                customAmount: customAmountVal,
                variantId: selectedVariantId,
              };
              if (isRecurring && recurringConfig) {
                body.sellingPlanId = selectedFrequency === "monthly" ? recurringConfig.monthlyPlanId : recurringConfig.weeklyPlanId;
              }
              const resp = await fetch(proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(body),
              });
              const result = await resp.json().catch(() => ({}));
              if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
              }
              throw new Error(result.error || "Custom donation failed");
            } catch (err) {
              setFeedback(feedback, `Failed: ${err.message}`, true);
              addBtn.textContent = "Add Donation to Cart";
              addBtn.disabled = false;
              return;
            }
          }
        }

        // ── Preset amount path: form POST (bypasses AJAX cart lock / 409) ────
        const numericId = selectedVariantId.includes("/")
          ? selectedVariantId.split("/").pop()
          : selectedVariantId;

        let sellingPlanId = null;
        if (isRecurring && recurringConfig) {
          sellingPlanId = selectedFrequency === "monthly" ? recurringConfig.monthlyPlanId : recurringConfig.weeklyPlanId;
        }

        setFeedback(feedback, "✓ Adding donation…", false);
        cartAddViaForm(numericId, 1, properties, "/cart", sellingPlanId);
      });
    }

    renderCampaign();
  }

  /**
   * Set feedback message in the feedback div.
   * @param {HTMLElement} el
   * @param {string}      msg
   * @param {boolean}     isError
   */
  function setFeedback(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.className =
      "donation-product-block__feedback" + (isError ? " error" : "");
  }

  /**
   * Add a variant to the cart via a native HTML form POST to /cart/add.
   * Completely avoids the AJAX cart lock (409 Conflict).
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
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        append(`properties[${k}]`, v);
      }
    }
    if (sellingPlanId) {
      append("selling_plan", sellingPlanId);
    }
    append("return_to", returnTo || "/cart");

    document.body.appendChild(form);
    form.submit();
  }

  /* ─── Cart API ────────────────────────────────────────────────────────────── */

  /**
   * Add a variant to the Shopify cart via AJAX.
   * @param {string} variantId  Shopify variant GID or numeric ID
   * @param {number} quantity
   * @param {Object} properties  Line item properties
   * @returns {Promise<Object>}
   */
  async function addToCart(variantId, quantity, properties) {
    const numericId = variantId.includes("/")
      ? variantId.split("/").pop()
      : variantId;

    const cartEndpoint = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/") + "cart/add.js";

    let formData = new FormData();
    formData.append('id', numericId);
    formData.append('quantity', quantity);
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        formData.append('properties[' + k + ']', v);
      }
    }

    const response = await fetch(cartEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      let errStr = "Cart add failed";
      try {
        const json = JSON.parse(text);
        errStr = json.description || json.message || ("Cart add failed. JSON: " + JSON.stringify(json));
      } catch (e) {
        errStr = "Cart add failed. Response: " + text.substring(0, 100);
      }
      throw new Error(errStr);
    }

    return response.json();
  }

  /* ─── Bootstrap ──────────────────────────────────────────────────────────── */

  /**
   * Initialise all donation product blocks found on the page.
   */
  async function init() {
    const containers = document.querySelectorAll(".donation-product-block");
    if (!containers.length) return;

    for (const container of containers) {
      const loadingEl = container.querySelector(
        ".donation-product-block__loading"
      );
      const errorEl = container.querySelector(".donation-product-block__error");
      const apiUrl = resolveApiUrl(container);

      try {
        const { campaigns, recurringConfig } = await fetchCampaignData(apiUrl);
        if (loadingEl) loadingEl.style.display = "none";
        renderWidget(container, campaigns, recurringConfig);
      } catch (err) {
        console.error("[DonationProductBlock] Error:", err);
        if (loadingEl) loadingEl.style.display = "none";
        if (errorEl) errorEl.style.display = "";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
