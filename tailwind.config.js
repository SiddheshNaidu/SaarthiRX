/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Quicksand', 'system-ui', 'sans-serif'],
                display: ['Quicksand', 'Inter', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#FF8C00',
                    light: '#FFA733',
                    dark: '#CC7000',
                },
                'warm-bg-start': '#FDFCF0',
                'warm-bg-end': '#FFF5E6',
                'premium-gradient-start': '#FFF5E6',
                'premium-gradient-end': '#FFE4CC',
            },
            fontSize: {
                'body': '24px',
                'header': '32px',
                'xl-header': '40px',
                'hero': '48px',
            },
            spacing: {
                'touch-target': '80px',
                'xl-touch': '150px',
            },
            minHeight: {
                'button': '80px',
            },
            maxWidth: {
                'mobile': '500px',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'ripple': 'ripple 0.8s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                ripple: {
                    '0%': { transform: 'scale(0)', opacity: '0.6' },
                    '100%': { transform: 'scale(3)', opacity: '0' },
                }
            },
            boxShadow: {
                'premium': '0 8px 30px rgba(0, 0, 0, 0.12)',
                'premium-lg': '0 15px 50px rgba(0, 0, 0, 0.15)',
            },
        },
    },
    plugins: [],
}
