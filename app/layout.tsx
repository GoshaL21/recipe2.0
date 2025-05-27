import './globals.css';

export const metadata = {
    title: 'Recipe App',
    description: 'A simple recipe app',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}