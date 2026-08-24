export type Business = { id:string; name:string; type:string; area:string; score:number; verified:number; reviews:number; promise:string; tags:string[]; image:string };

export const businesses: Business[] = [
  { id:"kalanit-resort", name:"כלנית ריזורט", type:"מתחם אירוח", area:"כלנית", score:88, verified:76, reviews:34, promise:"בריכה מחוממת, אירוח למשפחות ומרחב משותף", tags:["משפחות","בריכה","שומרי שבת"], image:"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80" },
  { id:"olmeya", name:"עולמיה — Olmaya", type:"סוויטות לזוגות", area:"כלנית", score:94, verified:91, reviews:48, promise:"פרטיות מלאה ובריכה פרטית לכל סוויטה", tags:["זוגות","פרטיות","בריכה פרטית"], image:"https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1000&q=80" },
  { id:"shetach-galili", name:"שטח גלילי", type:"אטרקציות שטח", area:"כלנית", score:91, verified:84, reviews:57, promise:"רייזרים מתוחזקים, תדריך בטיחות ומסלולים למשפחות", tags:["משפחות","רייזרים","קבוצות"], image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80" },
];

export const questions = ["האם המקום נראה כמו בתמונות?","מה הובטח לך לפני ההזמנה?","מה קיבלת בפועל?","האם היו תשלומים או תנאים שלא נאמרו מראש?","האם פנית לבעל העסק, ואיך הוא טיפל בבעיה?"];

export type GalleryItem = { id:string; image:string; business:string; caption:string };

export const galleryItems: GalleryItem[] = [
  { id:"g1", image:"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80", business:"כלנית ריזורט", caption:"הבריכה המחוממת בדיוק כמו בתמונות שפורסמו" },
  { id:"g2", image:"https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=900&q=80", business:"עולמיה — Olmaya", caption:"סוויטה פרטית עם בריכה — הוכחת ביקור מאומתת" },
  { id:"g3", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", business:"שטח גלילי", caption:"מסלול רייזרים למשפחות, תדריך בטיחות בפועל" },
  { id:"g4", image:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", business:"כלנית ריזורט", caption:"החדר כפי שנמסר בפועל לאורחים" },
  { id:"g5", image:"https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80", business:"עולמיה — Olmaya", caption:"קבלה שצורפה כהוכחת ביקור לביקורת" },
  { id:"g6", image:"https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=900&q=80", business:"שטח גלילי", caption:"ציוד בטיחות שסופק בפועל לכל משתתף" },
];
