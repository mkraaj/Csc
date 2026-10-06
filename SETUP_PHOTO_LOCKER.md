# Photo Locker — Firebase setup (sirf 1 baar, phone se ho jayega)

Chrome mein "Desktop site" on kar lena, console aasaan dikhega. Koi card/payment nahi chahiye.

1. https://console.firebase.google.com par Google account se login karo → **Add project** → naam: `meghraj` → Google Analytics **off** → Create.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (support email chuno) → Save.
3. **Authentication → Settings → Authorized domains → Add domain**: `<aapka-username>.github.io`
4. **Build → Firestore Database → Create database** → location `asia-south1 (Mumbai)` → **Production mode** → Create.
5. Firestore → **Rules** tab → purana text hata kar is repo ki `firestore.rules` file ka poora text paste karo → **Publish**.
6. **Project settings (gear icon) → Your apps → Web (`</>`)** → app naam `meghraj-web` → Register → jo `firebaseConfig` dikhe use copy karo.
7. GitHub repo mein `src/lib/firebase.ts` kholo, `PASTE_...` wali values apni config se badlo → Commit.
   GitHub Actions apne aap site dobara build kar dega.

Test: site par Tools → Photo Locker → Continue with Google → photo add karo → doosre phone/PC par usi account se login karke dekho.

## Dhyan rakho
- Photos Firestore mein save hoti hain (Cloud Storage nahi), kyunki Firebase Cloud Storage ke liye ab Blaze plan (billing card) zaroori hai.
- Har photo ~650 KB ke JPG mein compress hoti hai (Firestore ki 1 MB limit ki wajah se). PNG transparency white ho jati hai.
- Free limit (Spark): 1 GiB storage, 50,000 reads/din. Kam use ke liye kaafi hai.
- Har user sirf apni photos dekh sakta hai — ye `firestore.rules` se enforce hota hai, isliye rules Publish karna na bhoolna.
