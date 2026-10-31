/**
 * MOMENTUM STORE & PLAY STORE BILLING MANAGER
 * 
 * Secure implementation:
 * - Backed by Supabase Auth and Edge Functions
 * - Validates Google Play subscriptions and purchases server-side
 * - Checks active entitlements dynamically via Row-Level Security
 * - Prevents client-side spoofing and local tampering
 */

class StoreManager {
  constructor() {
    this._isPro = false;
    this._initialized = false;
    this.supabaseClient = null;

    // Fail-closed cleanup of legacy unverified local keys
    localStorage.removeItem('momentum_is_pro');
    localStorage.removeItem('momentum_pro_expiry');
    localStorage.removeItem('momentum_pro_sig');

    this._initSupabase();
  }

  _initSupabase() {
    // If Supabase JS SDK is loaded on page and configured
    if (window.supabase && window.MOMENTUM_SUPABASE_CONFIG) {
      const { url, anonKey } = window.MOMENTUM_SUPABASE_CONFIG;
      this.supabaseClient = window.supabase.createClient(url, anonKey);
      this.refreshEntitlement();
    }
  }

  /**
   * Verified server entitlement check.
   * Returns true ONLY if confirmed by server-backed session.
   */
  hasProAccess() {
    return this._isPro;
  }

  /**
   * Queries Supabase public.entitlements for active, unrevoked Momentum Pro entitlement.
   */
  async refreshEntitlement() {
    if (!this.supabaseClient) {
      this._isPro = false;
      this._notifyStateChange();
      return false;
    }

    try {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      if (!session) {
        this._isPro = false;
        this._notifyStateChange();
        return false;
      }

      // Read active entitlements via Supabase RLS policy
      const { data, error } = await this.supabaseClient
        .from('entitlements')
        .select('product_id, expires_at, revoked_at')
        .in('product_id', ['momentum_pro', 'momentum_pro_monthly', 'momentum_pro_annual'])
        .is('revoked_at', null);

      if (error || !data || data.length === 0) {
        this._isPro = false;
      } else {
        const now = new Date();
        const active = data.some(item => !item.expires_at || new Date(item.expires_at) > now);
        this._isPro = active;
      }
    } catch (err) {
      console.warn('Entitlement check failed:', err);
      this._isPro = false;
    }

    this._notifyStateChange();
    return this._isPro;
  }

  /**
   * Verifies Google Play purchase via Supabase Edge Function
   */
  async verifyGooglePlayPurchase(purchaseDetails) {
    if (!this.supabaseClient) {
      return { success: false, error: 'Auth/Backend client not configured.' };
    }

    try {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      if (!session) {
        return { success: false, error: 'Sign-in required to bind purchase.' };
      }

      const response = await fetch(`${window.MOMENTUM_SUPABASE_CONFIG.url}/functions/v1/verify-google-play-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(purchaseDetails)
      });

      const resJson = await response.json();
      if (!response.ok || resJson.error) {
        return { success: false, error: resJson.error || 'Verification rejected by server.' };
      }

      await this.refreshEntitlement();
      return { success: true, message: 'Google Play subscription verified successfully.' };
    } catch (err) {
      return { success: false, error: err.message || 'Verification network failure.' };
    }
  }

  // Google Play Billing Checkout (Hooked to Capacitor / Play Billing client)
  async purchasePro(plan = 'monthly') {
    if (!this.supabaseClient) {
      return { success: false, error: 'Purchases are unavailable until backend connection is initialized.' };
    }

    // When running inside Android Capacitor wrapper:
    if (window.Capacitor && window.Capacitor.isPluginAvailable('GooglePlayBilling')) {
      try {
        const productId = plan === 'annual' ? 'momentum_pro_annual' : 'momentum_pro_monthly';
        const purchase = await window.Capacitor.Plugins.GooglePlayBilling.purchase({ productId });
        return await this.verifyGooglePlayPurchase({
          package_name: 'com.vinayreddy.momentum',
          product_id: productId,
          purchase_token: purchase.token,
          is_subscription: true
        });
      } catch (err) {
        return { success: false, error: err.message || 'Google Play purchase canceled or failed.' };
      }
    }

    return { 
      success: false, 
      error: 'Google Play purchases must be completed inside the verified Android app or via Web Checkout.' 
    };
  }

  async watchRewardedAd() {
    // Rewarded access requires trusted server reward verification token
    return { success: false, error: 'Rewarded access requires trusted server reward token.' };
  }

  _notifyStateChange() {
    window.dispatchEvent(new CustomEvent('momentum:pro_status_changed', {
      detail: { isPro: this.hasProAccess() }
    }));
  }
}

window.storeManager = new StoreManager();
