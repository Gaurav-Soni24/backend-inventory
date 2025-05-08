import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFyrCuGQSsaOBSIMLqM8PIZlKu9vBI3Bk",
  authDomain: "inventory-management-sys-5223b.firebaseapp.com",
  projectId: "inventory-management-sys-5223b",
  storageBucket: "inventory-management-sys-5223b.firebasestorage.app",
  messagingSenderId: "458873429371",
  appId: "1:458873429371:web:1c66a20a8b0f30d47df1de"
};

// Initialize Firebase
let firebaseApp;
let db;
let auth;

try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

const app = express();
const port = 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Test endpoint
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Test Firestore endpoint
app.get('/test-firestore', async (req, res) => {
  try {
    const testCollection = collection(db, 'test');
    const docRef = await addDoc(testCollection, {
      message: 'Test successful',
      timestamp: new Date()
    });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error testing Firestore:', error);
    res.status(500).json({ error: error.message });
  }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store additional user data in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      name,
      role,
      createdAt: new Date()
    };

    await addDoc(collection(db, 'users'), userData);

    res.status(201).json({
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User data not found' });
    }

    const userData = querySnapshot.docs[0].data();

    res.json({
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
