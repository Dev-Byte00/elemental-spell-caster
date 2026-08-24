import './globals.css';
import Script from 'next/script';
import { Orbitron, Rajdhani } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['700', '900'],
  display: 'swap'
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-rajdhani',
  weight: ['500', '600', '700'],
  display: 'swap'
});

export const metadata = {
  title: '🧙 Elemental Spell Caster',
  description: 'Teachable Machine AI-Powered Elemental Magic Battler built with Next.js and Tailwind CSS'
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <head>
        <Script
          src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.4.2/dist/speech-commands.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-dark-base text-[#e8f0ff] font-rajdhani overflow-hidden select-none antialiased">
        {children}
      </body>
    </html>
  );
}
