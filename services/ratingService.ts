import { db } from '../constants/firebase';
import { doc, runTransaction, collection, DocumentReference } from 'firebase/firestore';

interface ReviewData {
  professionalId: string;
  appointmentId: string;
  customerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

/**
 * دالة لحفظ التقييم وتحديث معدل النجوم وعدد التقييمات عند المهني وسط كوليكشن users
 */
export const submitReviewAndUpdateProfessional = async (
  professionalId: string,
  appointmentId: string,
  customerId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; error?: any }> => {
  
  // الإحالة على وثيقة المهني داخل كوليكشن users
  const professionalRef = doc(db, 'users', professionalId);
  const reviewsCollectionRef = collection(db, 'reviews');

  try {
    await runTransaction(db, async (transaction) => {
      const proDoc = await transaction.get(professionalRef);
      if (!proDoc.exists()) {
        throw new Error("المهني غير موجود في النظام!");
      }

      const proData = proDoc.data();
      
      // مطابقة الحقول مع الداتا ديالك: averageRating و reviewsCount
      const oldAverage: number = proData.averageRating || 0;
      const oldTotal: number = proData.reviewsCount || 0;

      const newTotal = oldTotal + 1;
      const newAverage = ((oldAverage * oldTotal) + rating) / newTotal;

      const newReviewRef: DocumentReference = doc(reviewsCollectionRef);
      
      const reviewData: ReviewData = {
        professionalId,
        appointmentId,
        customerId,
        rating,
        comment,
        createdAt: new Date()
      };

      // 1. حفظ التقييم في كوليكشن reviews مستقلة
      transaction.set(newReviewRef, reviewData);

      // 2. تحديث بروفايل المهني بالحقول الصحيحة ديالك
      transaction.update(professionalRef, {
        averageRating: parseFloat(newAverage.toFixed(1)),
        reviewsCount: newTotal
      });
    });

    console.log("تم حفظ التقييم وتحديث حساب المهني بنجاح! ⭐️");
    return { success: true };
  } catch (error) {
    console.error("خطأ في عملية التقييم: ", error);
    return { success: false, error };
  }
};