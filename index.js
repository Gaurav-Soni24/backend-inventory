import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
const port = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
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
    if (error.code === 'auth/invalid-credential') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Product Management Endpoints

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, category, tags, stock, minStock, price, supplier } = req.body;

    // Validate required fields
    if (!name || !sku || !category || !stock || !minStock || !price || !supplier) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Convert tags string to array if it's a string
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;

    const productData = {
      name,
      sku,
      category,
      tags: tagsArray,
      stock: Number(stock),
      minStock: Number(minStock),
      price: Number(price),
      supplier,
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'products'), productData);
    
    res.status(201).json({
      success: true,
      product: {
        id: docRef.id,
        ...productData
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, tags, stock, minStock, price, supplier } = req.body;

    // Validate required fields
    if (!name || !sku || !category || !stock || !minStock || !price || !supplier) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Convert tags string to array if it's a string
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;

    const productData = {
      name,
      sku,
      category,
      tags: tagsArray,
      stock: Number(stock),
      minStock: Number(minStock),
      price: Number(price),
      supplier,
      updatedAt: new Date()
    };

    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, productData);

    res.json({
      success: true,
      product: {
        id,
        ...productData
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search products
app.get('/api/products/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('name', '>=', query.toLowerCase()),
      where('name', '<=', query.toLowerCase() + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
