import './globals.css';

export const metadata = {
  title: 'Madeenat.com | B2B Laptop Inventory Marketplace',
  description: 'Connect with verified laptop suppliers, manage real-time inventory, and streamline bulk stock inquiries via automated WhatsApp integrations.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  themeColor: '#0a0e1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Madeenat',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
