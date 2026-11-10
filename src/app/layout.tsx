import {Montserrat} from 'next/font/google';
import './globals.css';
import {AppProvider} from '@/shared/lib/app-provider';
import {Metadata} from "next";
import {MyToastRegion} from "@/shared/ui/Toast";

const montserrat = Montserrat({subsets: ['latin']});

export const metadata: Metadata = {
    title: {
        default: "Калькулятор ТФЗ",
        template: "%s",
    },
    robots: {
        index: true,
        follow: true,
    },
    description: "Система расчета интегрального показателя токсических форм зоба",
    applicationName: "Калькулятор ТФЗ",
    appleWebApp: {
        title: "Калькулятор ТФЗ",
        capable: true,
    },
    icons: {
        apple: "/apple-icon.png",
    },

    // OpenGraph preview
    openGraph: {
        title: "Калькулятор ТФЗ",
        description: "Система расчета интегрального показателя токсических форм зоба",
        type: "website",
        url: "https://dental-implant-smr.ru/",
        images: [
            {
                url: "https://dental-implant-smr.ru/og-atlas.png",
                width: 1200,
                height: 630,
                alt: "Калькулятор ТФЗ",
            },
        ],
    },


    manifest: "/manifest.webmanifest",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={montserrat.className}>
        <AppProvider>
                    {children}
                    <MyToastRegion />
        </AppProvider>
        </body>
        </html>
    );
}