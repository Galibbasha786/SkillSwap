const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const waitForRazorpay = (timeoutMs = 8000) =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const started = Date.now();
    const tick = () => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      waitForRazorpay().then(resolve);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => waitForRazorpay().then(resolve);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

export const openRazorpayCheckout = (options) => {
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not loaded');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    try {
      const rzp = new window.Razorpay({
        ...options,
        handler: (response) => {
          finish(resolve, { type: 'success', response });
        },
        modal: {
          escape: true,
          backdropclose: false,
          ...options.modal,
          ondismiss: () => {
            options.modal?.ondismiss?.();
            finish(resolve, { type: 'dismissed' });
          },
        },
      });

      rzp.on('payment.failed', (response) => {
        finish(reject, new Error(response.error?.description || 'Payment failed'));
      });

      setTimeout(() => {
        try {
          rzp.open();
        } catch (openError) {
          finish(reject, openError);
        }
      }, 100);
    } catch (error) {
      finish(reject, error);
    }
  });
};
