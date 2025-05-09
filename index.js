import express from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
let db;
let auth;

try {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: "inventory-management-sys-5223b",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
  db = getFirestore();
  auth = getAuth();
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
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
    const testCollection = db.collection('test');
    const docRef = await testCollection.add({
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
    const userCredential = await auth.createUser({
      email,
      password,
      displayName: name,
      role
    });
    const user = userCredential.user;

    // Store additional user data in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      name,
      role,
      createdAt: new Date()
    };

    await db.collection('users').add(userData);

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
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const usersRef = db.collection('users');
    const q = usersRef.where('uid', '==', user.uid);
    const querySnapshot = await q.get();
    
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
    if (!db) {
      throw new Error('Database not initialized');
    }

    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

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

    const docRef = await db.collection('products').add(productData);
    
    res.status(201).json({
      success: true,
      product: {
        id: docRef.id,
        ...productData
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

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

    const productRef = db.collection('products').doc(id);
    await productRef.update(productData);

    res.json({
      success: true,
      product: {
        id,
        ...productData
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { id } = req.params;
    await db.collection('products').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products
app.get('/api/products/search', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { q: searchQuery } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const productsRef = db.collection('products');
    const queryRef = productsRef
      .where('name', '>=', searchQuery.toLowerCase())
      .where('name', '<=', searchQuery.toLowerCase() + '\uf8ff');

    const snapshot = await queryRef.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
