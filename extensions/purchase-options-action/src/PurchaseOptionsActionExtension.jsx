import "@shopify/ui-extensions/preact";
import { useState, useEffect } from "preact/hooks";

export default function PurchaseOptionsActionExtension() {
  const { close, data } = shopify;

  // Retrieve selected product/variant and selling plan group context
  const selectedItem = data?.selected?.[0];
  const productId = selectedItem?.id || "";
  const sellingPlanGroupId = selectedItem?.sellingPlanId || "";
  
  // If sellingPlanId is present, we are editing; if not, we are creating/adding
  const derivedIntent = sellingPlanGroupId ? "EDIT_PLAN_GROUP" : "CREATE_PLAN_GROUP";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sub-mode for creation flow: "new" (create new plan group) or "existing" (link existing plan group)
  const [subMode, setSubMode] = useState("new");

  // Form Fields for Create / Edit
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [mEnabled, setMEnabled] = useState(false);
  const [mInterval, setMInterval] = useState("1");
  const [mDiscount, setMDiscount] = useState("0");

  const [wEnabled, setWEnabled] = useState(false);
  const [wInterval, setWInterval] = useState("1");
  const [wDiscount, setWDiscount] = useState("0");

  // Fields for Add Existing
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Load configuration on mount or when context changes
  useEffect(() => {
    const init = async () => {
      try {
        if (derivedIntent === "EDIT_PLAN_GROUP" && sellingPlanGroupId) {
          await loadSellingPlanGroup();
        } else {
          // In Create flow, pre-load existing plan groups so "Add Existing" is populated
          await loadAllSellingPlanGroups();
        }
      } catch (err) {
        console.error("[Extension] Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [derivedIntent, sellingPlanGroupId]);

  const getAuthToken = async () => {
    try {
      if (typeof shopify.idToken === "function") {
        return await shopify.idToken();
      }
      if (shopify.idToken && typeof shopify.idToken.get === "function") {
        return await shopify.idToken.get();
      }
      if (shopify.sessionToken && typeof shopify.sessionToken.get === "function") {
        return await shopify.sessionToken.get();
      }
    } catch (e) {
      console.warn("Could not retrieve token programmatically:", e);
    }
    return "";
  };

  const loadSellingPlanGroup = async () => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/selling-plans?sellingPlanGroupId=${sellingPlanGroupId}`, {
      headers
    });
    const resData = await response.json();

    if (!response.ok || !resData.success) {
      throw new Error(resData.error || "Failed to load subscription settings");
    }

    setName(resData.sellingPlanGroup.name || "");
    setDescription(resData.sellingPlanGroup.description || "");

    setMEnabled(!!resData.monthly?.enabled);
    setMInterval(String(resData.monthly?.intervalCount || "1"));
    setMDiscount(String(resData.monthly?.discount || "0"));

    setWEnabled(!!resData.weekly?.enabled);
    setWInterval(String(resData.weekly?.intervalCount || "1"));
    setWDiscount(String(resData.weekly?.discount || "0"));
  };

  const loadAllSellingPlanGroups = async () => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch("/api/selling-plans", {
      headers
    });
    const resData = await response.json();

    if (!response.ok || !resData.success) {
      throw new Error(resData.error || "Failed to load selling plan groups");
    }

    const availableGroups = resData.groups || [];
    setGroups(availableGroups);
    if (availableGroups.length > 0) {
      setSelectedGroupId(availableGroups[0].id);
    }
  };

  const handleSave = async () => {
    setSaveError("");

    // Form validation
    if (derivedIntent === "EDIT_PLAN_GROUP" || (derivedIntent === "CREATE_PLAN_GROUP" && subMode === "new")) {
      if (!name.trim()) {
        setSaveError("Plan Group Name cannot be empty");
        return;
      }
      if (!mEnabled && !wEnabled) {
        setSaveError("Please enable at least one billing option (Monthly or Weekly)");
        return;
      }
    }

    if (derivedIntent === "CREATE_PLAN_GROUP" && subMode === "existing" && !selectedGroupId) {
      setSaveError("Please select a selling plan group to link");
      return;
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      
      let payload = {
        productId: productId,
      };

      if (derivedIntent === "CREATE_PLAN_GROUP") {
        if (subMode === "new") {
          payload.action = "CREATE";
          payload.name = name;
          payload.description = description;
          payload.monthlyEnabled = mEnabled;
          payload.monthlyInterval = mInterval;
          payload.monthlyDiscount = mDiscount;
          payload.weeklyEnabled = wEnabled;
          payload.weeklyInterval = wInterval;
          payload.weeklyDiscount = wDiscount;
        } else {
          payload.action = "ADD_EXISTING";
          payload.id = selectedGroupId;
        }
      } else {
        // EDIT_PLAN_GROUP
        payload.action = "UPDATE";
        payload.id = sellingPlanGroupId;
        payload.name = name;
        payload.description = description;
        payload.monthlyEnabled = mEnabled;
        payload.monthlyInterval = mInterval;
        payload.monthlyDiscount = mDiscount;
        payload.weeklyEnabled = wEnabled;
        payload.weeklyInterval = wInterval;
        payload.weeklyDiscount = wDiscount;
      }

      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/selling-plans", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Save mutation failed");
      }
      close();
    } catch (err) {
      console.error("[Extension] Save error:", err);
      setSaveError(err.message || "Failed to complete the action");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaveError("");
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload = {
        action: "REMOVE",
        productId: productId,
        id: sellingPlanGroupId
      };

      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/selling-plans", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Remove mutation failed");
      }
      close();
    } catch (err) {
      console.error("[Extension] Remove error:", err);
      setSaveError(err.message || "Failed to unlink the subscription plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <s-admin-action title="Loading Subscription Settings">
        <s-stack direction="block" alignment="center" gap="base">
          <s-text>Loading details...</s-text>
        </s-stack>
      </s-admin-action>
    );
  }

  if (error) {
    return (
      <s-admin-action title="Error Loading Subscription">
        <s-button slot="primary-action" onClick={close}>Close</s-button>
        <s-stack direction="block" gap="base">
          <s-text tone="critical">{error}</s-text>
          <s-text>The subscription plan might have been deleted or is currently unavailable.</s-text>
        </s-stack>
      </s-admin-action>
    );
  }

  const actionTitle = derivedIntent === "CREATE_PLAN_GROUP" ? "Add Purchase Option" : "Edit Purchase Option";

  return (
    <s-admin-action title={actionTitle}>
      <s-button slot="primary-action" onClick={handleSave} loading={saving}>Save</s-button>
      <s-button slot="secondary-actions" onClick={close}>Cancel</s-button>
      {derivedIntent === "EDIT_PLAN_GROUP" && (
        <s-button slot="secondary-actions" onClick={handleRemove} loading={saving} tone="critical">Remove</s-button>
      )}

      <s-stack direction="block" gap="large">
        {saveError && <s-text tone="critical">{saveError}</s-text>}

        {/* Sub-mode Selection for Create flow */}
        {derivedIntent === "CREATE_PLAN_GROUP" && (
          <s-select
            label="Option Type"
            value={subMode}
            onChange={(event) => setSubMode(event.currentTarget.value)}
          >
            <s-option value="new">Create New Subscription Plan</s-option>
            <s-option value="existing">Add Existing Subscription Plan</s-option>
          </s-select>
        )}

        {/* FORM: Link Existing Plan */}
        {derivedIntent === "CREATE_PLAN_GROUP" && subMode === "existing" ? (
          groups.length === 0 ? (
            <s-text>No existing subscription plan groups found. Please create a new one.</s-text>
          ) : (
            <s-select
              label="Select Subscription Plan Group"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.currentTarget.value)}
            >
              {groups.map((group) => (
                <s-option key={group.id} value={group.id}>
                  {group.name}
                </s-option>
              ))}
            </s-select>
          )
        ) : (
          /* FORM: Create New or Edit Plan Group */
          <s-stack direction="block" gap="large">
            <s-text-field
              label="Plan Group Name"
              placeholder="e.g. Recurring Donations"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <s-text-field
              label="Internal Description"
              placeholder="Add internal notes..."
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />

            <s-box padding="base" border="solid">
              <s-stack direction="block" gap="base">
                <s-checkbox
                  label="Enable Monthly Option"
                  checked={mEnabled}
                  onChange={(event) => setMEnabled(event.currentTarget.checked)}
                />
                {mEnabled && (
                  <s-stack gap="base" direction="inline" alignItems="end">
                    <s-number-field
                      label="Billing Interval (Months)"
                      value={mInterval}
                      onChange={(event) => setMInterval(event.currentTarget.value)}
                      min="1"
                    />
                    <s-number-field
                      label="Discount Percentage (%)"
                      value={mDiscount}
                      onChange={(event) => setMDiscount(event.currentTarget.value)}
                      min="0"
                      max="100"
                    />
                  </s-stack>
                )}
              </s-stack>
            </s-box>

            <s-box padding="base" border="solid">
              <s-stack direction="block" gap="base">
                <s-checkbox
                  label="Enable Weekly Option"
                  checked={wEnabled}
                  onChange={(event) => setWEnabled(event.currentTarget.checked)}
                />
                {wEnabled && (
                  <s-stack gap="base" direction="inline" alignItems="end">
                    <s-number-field
                      label="Billing Interval (Weeks)"
                      value={wInterval}
                      onChange={(event) => setWInterval(event.currentTarget.value)}
                      min="1"
                    />
                    <s-number-field
                      label="Discount Percentage (%)"
                      value={wDiscount}
                      onChange={(event) => setWDiscount(event.currentTarget.value)}
                      min="0"
                      max="100"
                    />
                  </s-stack>
                )}
              </s-stack>
            </s-box>
          </s-stack>
        )}
      </s-stack>
    </s-admin-action>
  );
}