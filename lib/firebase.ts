import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, Timestamp, addDoc 
} from "firebase/firestore";

// TODO: Replace with your actual config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface TiffinStats {
  totalDays: number;
  skippedDays: number;
  totalCost: number;
  totalPaid: number;
  balance: number; // Positive = Due, Negative = Advance
  isTodaySkipped: boolean;
}

export class FirebaseService {
  private static COST_PER_MEAL = 60;
  // Hardcoded start date as per requirements
  private static START_DATE = new Date("2026-02-01"); 

  /**
   * Calculates the full financial snapshot for the user.
   */
  static async getDashboardStats(uid: string): Promise<TiffinStats> {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Calculate Total Days (Inclusive)
    const now = new Date();
    // Reset times to midnight to ensure accurate day diff
    const start = new Date(this.START_DATE); start.setHours(0,0,0,0);
    const current = new Date(now); current.setHours(0,0,0,0);
    
    const diffTime = Math.abs(current.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

    // 2. Fetch Skips
    const skipsRef = collection(db, `users/${uid}/skips`);
    const skipSnapshot = await getDocs(skipsRef);
    const skippedDays = skipSnapshot.size;
    const isTodaySkipped = skipSnapshot.docs.some(doc => doc.id === todayStr);

    // 3. Fetch Payments
    const paymentsRef = collection(db, `users/${uid}/payments`);
    const paymentSnapshot = await getDocs(paymentsRef);
    let totalPaid = 0;
    paymentSnapshot.forEach(doc => {
      totalPaid += doc.data().amount || 0;
    });

    // 4. Calculate Math
    const chargeableDays = totalDays - skippedDays;
    const totalCost = chargeableDays * this.COST_PER_MEAL;
    const balance = totalCost - totalPaid;

    return {
      totalDays,
      skippedDays,
      totalCost,
      totalPaid,
      balance,
      isTodaySkipped
    };
  }

  /**
   * Toggles the skip status for a specific date (YYYY-MM-DD)
   */
  static async toggleSkip(uid: string, dateStr: string, isSkipping: boolean) {
    const docRef = doc(db, `users/${uid}/skips`, dateStr);
    if (isSkipping) {
      await setDoc(docRef, { timestamp: Timestamp.now() });
    } else {
      await deleteDoc(docRef);
    }
  }

  /**
   * Log a payment
   */
  static async addPayment(uid: string, amount: number) {
    await addDoc(collection(db, `users/${uid}/payments`), {
      amount,
      date: Timestamp.now(),
      note: "Manual Entry"
    });
  }
}