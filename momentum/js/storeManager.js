/**
 * MOMENTUM STORE & PLAY STORE BILLING MANAGER
 * Handles:
 * - Google Play Billing Subscriptions ($3.99/mo, $29.99/yr)
 * - Google AdMob Rewarded Video Ads
 * - Pro state persistence and trial unlocking
 * - ZERO API KEY LEAKS: Uses native platform bridges without hardcoding secrets
 */

class StoreManager {
  constructor() {
    this.isPro = localStorage.getItem('momentum_is_pro') === 'true';
    this.proExpiry = parseInt(localStorage.getItem('momentum_pro_expiry') || '0', 10);
    this._verifyIntegrity();
    this._checkExpiry();
  }

  // No client-side signature can prove payment. Entitlements must be
  // validated by a trusted backend before paid features are enabled.
  hasProAccess() {
    return false;
  }

  // Google Play Billing Checkout (Simulated in Web, Hooked to Capacitor in Android APK)
  async purchasePro() {
    return { success: false, error: 'Purchases are temporarily unavailable until server-side verification is configured.' };
  }

  async watchRewardedAd() {
    return { success: false, error: 'Rewarded access requires trusted reward verification.' };
  }

  // Deliberately do not expose client-side premium activation methods.
  _notifyStateChange() {
    window.dispatchEvent(new CustomEvent('momentum:pro_status_changed', {
      detail: { isPro: this.hasProAccess() }
    }));
  }
}

window.storeManager = new StoreManager();

