export default function MaintenancePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
            color: '#fff',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: '2rem',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '4rem',
                marginBottom: '1.5rem',
            }}>
                🔧
            </div>
            <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                marginBottom: '1rem',
                background: 'linear-gradient(90deg, #f0c27f, #fc5c7d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}>
                Đang bảo trì hệ thống
            </h1>
            <p style={{
                fontSize: '1.2rem',
                color: '#a0a0b8',
                maxWidth: '500px',
                lineHeight: 1.6,
                marginBottom: '2rem',
            }}>
                Hệ thống VACTIT đang được nâng cấp để mang đến trải nghiệm tốt hơn.
                Vui lòng quay lại sau ít phút.
            </p>
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                color: '#6c6c8a',
                fontSize: '0.9rem',
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#fc5c7d',
                    animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                Maintenance in progress
            </div>
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
        </div>
    );
}
