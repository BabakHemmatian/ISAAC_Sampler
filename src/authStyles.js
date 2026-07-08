// Single source of truth for the auth screens' look (fonts, colors, box radius)
// so <Auth /> and <AuthAction /> render identically and stay in sync with the
// site's design. Keep this in lockstep with the app's global font choices.
import { useEffect } from 'react';

// Rounded-corner value used across the app's cards/buttons/inputs.
const BR_ONLY = '12px 12px 0 12px';

export const AUTH_FONT_CSS = `
  @font-face {
    font-family: 'OctoberCompressedDevanagari';
    src: url('/fonts/OctoberCompressedDevanagari.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }

  /* Utility classes */
  .isaac-body { font-family: 'IBM Plex Sans Devanagari', 'IBM Plex Sans', Arial, sans-serif; color: #2D2D2D; }
  .isaac-heading {
    font-family: 'OctoberCompressedDevanagari','IBM Plex Sans Devanagari','IBM Plex Sans', Arial, sans-serif;
    font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
  }
  .br-only { border-radius: ${BR_ONLY} !important; }

  .br-only .card, .br-only.card, .br-only .btn, .br-only .form-control, .br-only .alert {
    border-radius: ${BR_ONLY} !important;
  }

  /* Toggle buttons (react-bootstrap) */
  .toggle-login-custom {
    border-top-left-radius: 12px !important;
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 12px !important;
    border-bottom-left-radius: 0 !important;
  }
  .toggle-signup-custom {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 12px !important;
    border-bottom-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  }
`;

// Load IBM Plex Sans Devanagari from Google Fonts (matches the rest of the app).
export function useAuthFonts() {
  useEffect(() => {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';

    const plexLink = document.createElement('link');
    plexLink.rel = 'stylesheet';
    plexLink.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Devanagari:wght@400;500;600;700&display=swap';

    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(plexLink);
    return () => {
      document.head.removeChild(preconnect1);
      document.head.removeChild(preconnect2);
      document.head.removeChild(plexLink);
    };
  }, []);
}
