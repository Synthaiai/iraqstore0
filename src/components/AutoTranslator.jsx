import { useEffect, useRef } from 'react';
import { usePrefs } from '../store/PrefsContext';
import { translateTextSync, queueAsyncTranslation } from '../utils/translator';

/**
 * Universal Auto-Translator Component
 * Ensures every single text node in the entire web application is translated to English cleanly
 * when the language is set to English ('en'), and restored back when set to Arabic ('ar').
 */
export default function AutoTranslator() {
  const { lang } = usePrefs();
  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (lang === 'ar') {
      // Revert all translated nodes back to original Arabic
      const translatedEls = document.querySelectorAll('[data-ar-text]');
      translatedEls.forEach((el) => {
        if (el.dataset.arText) {
          el.textContent = el.dataset.arText;
          el.removeAttribute('data-ar-text');
        }
      });
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      return;
    }

    // Translation function for DOM text nodes & elements
    const translateElement = (el) => {
      if (!el || el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'textarea', 'input', 'code', 'pre'].includes(tag)) {
        return;
      }

      // Check direct text nodes
      for (const node of el.childNodes) {
        if (node.nodeType === 3) { // Text node
          const text = node.nodeValue;
          if (text && /[\u0600-\u06FF]/.test(text)) {
            const trimmed = text.trim();
            if (trimmed) {
              if (!node.__origArText) {
                node.__origArText = text;
              }
              const trans = translateTextSync(trimmed);
              if (trans && trans !== trimmed) {
                node.nodeValue = text.replace(trimmed, trans);
              }
            }
          }
        }
      }

      // Check placeholder / title / aria-label
      if (el.getAttribute('placeholder') && /[\u0600-\u06FF]/.test(el.getAttribute('placeholder'))) {
        const ph = el.getAttribute('placeholder');
        el.setAttribute('placeholder', translateTextSync(ph));
      }
      if (el.getAttribute('title') && /[\u0600-\u06FF]/.test(el.getAttribute('title'))) {
        const title = el.getAttribute('title');
        el.setAttribute('title', translateTextSync(title));
      }
    };

    const runFullPass = () => {
      const all = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, strong, em, a, button, label, dt, dd, small, b, li, option, div');
      all.forEach((el) => translateElement(el));
    };

    runFullPass();

    // Set up MutationObserver to catch dynamically rendered elements
    const observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          mut.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              translateElement(node);
              const children = node.querySelectorAll ? node.querySelectorAll('*') : [];
              children.forEach(translateElement);
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    observerRef.current = observer;

    const handleTranslatedEvent = () => {
      runFullPass();
    };

    window.addEventListener('iraqstore:translated', handleTranslatedEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener('iraqstore:translated', handleTranslatedEvent);
    };
  }, [lang]);

  return null;
}
