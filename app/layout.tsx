import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"RealityScore — מה הובטח, מה קיבלת",description:"מערכת אמון מבוססת מיקום לביקורות מאומתות, הבטחה מול מציאות וטיפול הוגן בתלונות.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"},openGraph:{title:"RealityScore — מה הובטח, מה קיבלת",description:"ביקורות מאומתות לפי מיקום והבטחה מול מציאות.",type:"website"},twitter:{card:"summary",title:"RealityScore",description:"אל תבחר לפי כוכבים. בחר לפי המציאות."}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>}
