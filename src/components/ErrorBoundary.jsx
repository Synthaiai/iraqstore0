import { Component } from 'react';

/**
 * Converts any render/runtime crash into a friendly, recoverable screen instead
 * of a blank white page. Also logs the error so it can be diagnosed.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crash caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            textAlign: 'center',
            background: '#0b0b0c',
            color: '#fff',
            fontFamily: "'Plus Jakarta Sans','IBM Plex Sans Arabic',sans-serif",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#6b0f1a',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 1.25rem',
                fontSize: 28,
              }}
            >
              ⟳
            </div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.6rem' }}>حدث خطأ غير متوقّع</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              نعتذر — واجه المتجر مشكلة مؤقتة. أعد تحميل الصفحة للمتابعة.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.assign('/');
              }}
              style={{
                padding: '0.85rem 2rem',
                borderRadius: 999,
                border: 0,
                background: '#fff',
                color: '#0b0b0c',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              العودة إلى الرئيسية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
