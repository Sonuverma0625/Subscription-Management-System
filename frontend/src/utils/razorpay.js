let checkoutScriptPromise;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => { checkoutScriptPromise = null; resolve(false); };
      document.head.appendChild(script);
    });
  }
  return checkoutScriptPromise;
}
