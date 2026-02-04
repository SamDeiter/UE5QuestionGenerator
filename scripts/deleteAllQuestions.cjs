/**
 * DELETE ALL QUESTIONS FROM PRODUCTION FIRESTORE
 * 
 * Run with: node deleteAllQuestions.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Production Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYnC3nkQ7mX8vh7zV0KZ8mP5nY6rQ8xZE",
  authDomain: "ue5-questions-prod.firebaseapp.com",
  projectId: "ue5-questions-prod",
  storageBucket: "ue5-questions-prod.firebasestorage.app",
  messagingSenderId: "447839235345",
  appId: "1:447839235345:web:afef1ddbe3a1fd8c1eaee1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllQuestions() {
  try {
    console.log('🔥 Fetching all questions from Firestore...');
    
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    console.log(`📊 Found ${snapshot.size} questions to delete`);
    
    if (snapshot.size === 0) {
      console.log('✅ No questions to delete');
      return;
    }
    
    // Delete all questions
    const deletePromises = [];
    snapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, 'questions', docSnap.id)));
    });
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} questions from production Firestore`);
    console.log('🎉 Database is now clean!');
    
  } catch (error) {
    console.error('❌ Error deleting questions:', error);
  }
}

deleteAllQuestions();
