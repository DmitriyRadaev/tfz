import {Montserrat} from 'next/font/google';
import './globals.css';
import {AppProvider} from '@/shared/lib/app-provider';
import {Metadata} from "next";
import {MyToastRegion} from "@/shared/ui/Toast";
import { appPath } from "@/shared/lib/app-path";

const montserrat = Montserrat({subsets: ['latin']});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.APP_ORIGIN ?? "http://172.26.4.9"),
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
        apple: appPath("/apple-icon.png"),
    },

    // OpenGraph preview
    openGraph: {
        title: "Калькулятор ТФЗ",
        description: "Система расчета интегрального показателя токсических форм зоба",
        type: "website",
        url: appPath("/"),
        images: [
            {
                url: appPath("/og-atlas.png"),
                width: 1200,
                height: 630,
                alt: "Калькулятор ТФЗ",
            },
        ],
    },


    manifest: appPath("/manifest.webmanifest"),
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
