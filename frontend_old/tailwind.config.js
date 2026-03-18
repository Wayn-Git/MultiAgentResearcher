/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0a',
                foreground: '#ffffff',
                muted: '#262626',
                card: '#111111',
                border: '#404040'
            },
            fontFamily: {
                mono: ['"Space Mono"', 'monospace', '"JetBrains Mono"', '"VT323"'],
                pixel: ['"VT323"', 'monospace']
            },
            backgroundImage: {
                'dot-pattern': 'radial-gradient(circle, #333 1px, transparent 1px)',
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            },
            backgroundSize: {
                'dot-size': '16px 16px',
            }
        },
    },
    plugins: [],
}
