import "./globals.css";

export const metadata = {
    title: "LearnFlix | AI-Powered Learning Platform",
    description: "Binge-worthy adaptive learning powered by AI — like Netflix, but for education.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
            </head>
            <body className="antialiased min-h-screen selection:bg-primary/30" style={{ backgroundColor: '#141414', color: '#E5E5E5' }}>
                {children}
            </body>
        </html>
    );
}
