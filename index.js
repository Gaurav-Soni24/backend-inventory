import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
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
  res.send('Multi-App Backend Server - Inventory Management & Neural Note');
});

// =============================================================================
// INVENTORY MANAGEMENT SYSTEM APIs (Existing)
// =============================================================================

// Product Management Endpoints

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    if (querySnapshot.empty) {
      return res.json([]);
    }

    const products = querySnapshot.docs.map(doc => ({
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

    const productRef = doc(db, 'products', id);
    
    // First check if the product exists
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) {
      return res.status(404).json({ error: 'Product not found' });
    }

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
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
    
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

    const productsRef = collection(db, 'products');
    const queryRef = query(
      productsRef,
      where('name', '>=', searchQuery.toLowerCase()),
      where('name', '<=', searchQuery.toLowerCase() + '\uf8ff')
    );

    const querySnapshot = await getDocs(queryRef);
    
    if (querySnapshot.empty) {
      return res.json([]);
    }

    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory Management Auth Endpoints
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
      app: 'inventory',
      createdAt: new Date()
    };

    await addDoc(collection(db, 'users'), userData);

    res.status(201).json({
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name,
        role,
        app: 'inventory'
      }
    });
  } catch (error) {
    console.error('Error in inventory signup:', error);
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
    const q = query(usersRef, where('uid', '==', user.uid), where('app', '==', 'inventory'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User data not found for inventory app' });
    }

    const userData = querySnapshot.docs[0].data();

    res.json({
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role,
        app: 'inventory'
      }
    });
  } catch (error) {
    console.error('Error in inventory login:', error);
    if (error.code === 'auth/invalid-credential') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Stock Management Endpoints

// Get all stock logs
app.get('/api/stock-logs', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const stockLogsRef = collection(db, 'stockLogs');
    const querySnapshot = await getDocs(stockLogsRef);
    
    if (querySnapshot.empty) {
      return res.json([]);
    }

    const stockLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(stockLogs);
  } catch (error) {
    console.error('Error fetching stock logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new stock log
app.post('/api/stock-logs', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { productId, productName, type, quantity, notes } = req.body;

    // Validate required fields
    if (!productId || !productName || !type || !quantity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get the current user from auth (you'll need to implement proper auth middleware)
    const currentUser = 'Current User'; // This should come from your auth system

    // Get current date and time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const stockLogData = {
      productId,
      productName,
      type,
      quantity: Number(quantity),
      date,
      time,
      user: currentUser,
      notes: notes || '',
    };

    // Add the stock log
    const logRef = await addDoc(collection(db, 'stockLogs'), stockLogData);

    // Update the product stock
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productDoc.data();
    const newStock = type === 'in' 
      ? productData.stock + Number(quantity)
      : productData.stock - Number(quantity);

    await updateDoc(productRef, {
      stock: newStock,
      updatedAt: now
    });

    res.status(201).json({
      success: true,
      stockLog: {
        id: logRef.id,
        ...stockLogData
      }
    });
  } catch (error) {
    console.error('Error creating stock log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search stock logs
app.get('/api/stock-logs/search', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { type, date } = req.query;
    
    let stockLogsRef = collection(db, 'stockLogs');
    let constraints = [];

    if (type && type !== 'all') {
      constraints.push(where('type', '==', type));
    }

    if (date) {
      constraints.push(where('date', '==', date));
    }

    const q = query(stockLogsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.json([]);
    }

    const stockLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(stockLogs);
  } catch (error) {
    console.error('Error searching stock logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard Endpoints

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Get total products count
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    const totalProducts = productsSnapshot.size;

    // Calculate total inventory value
    let totalInventoryValue = 0;
    let totalCategories = new Set();
    let totalSuppliers = new Set();
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      totalInventoryValue += (product.stock * product.price);
      totalCategories.add(product.category);
      totalSuppliers.add(product.supplier);
    });

    // Get recent stock movements (last 7 days)
    const stockLogsRef = collection(db, 'stockLogs');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentStockQuery = query(
      stockLogsRef,
      where('date', '>=', sevenDaysAgo.toISOString().split('T')[0])
    );
    const recentStockSnapshot = await getDocs(recentStockQuery);
    const recentStockMovements = recentStockSnapshot.size;

    // Format the response
    const stats = [
      {
        icon: 'inventory',
        title: 'Total Products',
        value: totalProducts.toString(),
        color: '#2196F3'
      },
      {
        icon: 'attach_money',
        title: 'Total Inventory Value',
        value: `$${(totalInventoryValue / 1000).toFixed(1)}k`,
        color: '#4CAF50'
      },
      {
        icon: 'category',
        title: 'Product Categories',
        value: totalCategories.size.toString(),
        color: '#FF9800'
      },
      {
        icon: 'local_shipping',
        title: 'Active Suppliers',
        value: totalSuppliers.size.toString(),
        color: '#9C27B0'
      },
      {
        icon: 'sync',
        title: 'Recent Stock Movements',
        value: recentStockMovements.toString(),
        color: '#E91E63'
      }
    ];

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get navigation menu items
app.get('/api/dashboard/navigation', async (req, res) => {
  try {
    // This could be dynamic based on user role
    const navigationItems = [
      {
        icon: 'inventory',
        title: 'Products',
        route: 'Products',
        color: '#007AFF'
      },
      {
        icon: 'local-shipping',
        title: 'Stock Management',
        route: 'Stock',
        color: '#007AFF'
      }
    ];

    res.json(navigationItems);
  } catch (error) {
    console.error('Error fetching navigation items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/dashboard/profile', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Get user ID from auth token (you'll need to implement proper auth middleware)
    const userId = 'current-user-id'; // This should come from your auth system

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = querySnapshot.docs[0].data();
    
    res.json({
      name: userData.name,
      role: userData.role,
      email: userData.email
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// NEURAL NOTE APP APIs (New)
// =============================================================================

// Neural Note Signup endpoint
app.post('/api/neural-note/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required (email, password, firstName, lastName)' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists in Neural Note collection
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const existingUserQuery = query(neuralNoteUsersRef, where('email', '==', email.toLowerCase()));
    const existingUserSnapshot = await getDocs(existingUserQuery);

    if (!existingUserSnapshot.empty) {
      return res.status(409).json({ 
        success: false,
        error: 'An account with this email already exists' 
      });
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store Neural Note specific user data in Firestore
    const userData = {
      uid: user.uid,
      email: user.email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      app: 'neural-note',
      isActive: true,
      preferences: {
        theme: 'light',
        notifications: true,
        autoSave: true
      },
      stats: {
        totalNotes: 0,
        totalCategories: 0,
        lastLogin: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(neuralNoteUsersRef, userData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.uid,
        docId: docRef.id,
        email: user.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        app: 'neural-note',
        isActive: userData.isActive,
        preferences: userData.preferences,
        stats: userData.stats
      }
    });
  } catch (error) {
    console.error('Error in Neural Note signup:', error);
    
    // Handle specific Firebase Auth errors
    let errorMessage = 'Failed to create account';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please choose a stronger password';
    }

    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.message 
    });
  }
});

// Neural Note Login endpoint
app.post('/api/neural-note/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Sign in user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Neural Note specific collection
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'Neural Note account not found. Please sign up first.' 
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Check if account is active
    if (!userData.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Your account has been deactivated. Please contact support.' 
      });
    }

    // Update last login time
    await updateDoc(userDoc.ref, {
      'stats.lastLogin': new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.uid,
        docId: userDoc.id,
        email: user.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        app: 'neural-note',
        isActive: userData.isActive,
        preferences: userData.preferences,
        stats: {
          ...userData.stats,
          lastLogin: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error in Neural Note login:', error);
    
    // Handle specific Firebase Auth errors
    let errorMessage = 'Login failed';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
    }

    res.status(401).json({ 
      success: false,
      error: errorMessage 
    });
  }
});

// Neural Note - Get user profile
app.get('/api/neural-note/user/profile/:userId', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'User profile not found' 
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    res.json({
      success: true,
      user: {
        id: userData.uid,
        docId: userDoc.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        isActive: userData.isActive,
        preferences: userData.preferences,
        stats: userData.stats,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching Neural Note user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user profile' 
    });
  }
});

// Neural Note - Update user profile
app.put('/api/neural-note/user/profile/:userId', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { userId } = req.params;
    const { firstName, lastName, preferences } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    // Find user document
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userDoc = querySnapshot.docs[0];
    const currentData = userDoc.data();

    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };

    if (firstName && firstName.trim()) {
      updateData.firstName = firstName.trim();
    }

    if (lastName && lastName.trim()) {
      updateData.lastName = lastName.trim();
    }

    if (updateData.firstName || updateData.lastName) {
      updateData.fullName = `${updateData.firstName || currentData.firstName} ${updateData.lastName || currentData.lastName}`;
    }

    if (preferences && typeof preferences === 'object') {
      updateData.preferences = {
        ...currentData.preferences,
        ...preferences
      };
    }

    // Update the document
    await updateDoc(userDoc.ref, updateData);

    // Get updated data
    const updatedDoc = await getDoc(userDoc.ref);
    const updatedData = updatedDoc.data();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedData.uid,
        docId: updatedDoc.id,
        email: updatedData.email,
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        fullName: updatedData.fullName,
        isActive: updatedData.isActive,
        preferences: updatedData.preferences,
        stats: updatedData.stats,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating Neural Note user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile' 
    });
  }
});

// Neural Note - Password reset request
app.post('/api/neural-note/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check if user exists in Neural Note collection
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'No Neural Note account found with this email address' 
      });
    }

    // Note: You would typically use Firebase Auth's sendPasswordResetEmail here
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Error in Neural Note password reset:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process password reset request' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Neural Note - Check email availability
app.get('/api/neural-note/auth/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check if email exists in Neural Note collection
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    res.json({
      success: true,
      available: querySnapshot.empty,
      message: querySnapshot.empty ? 'Email is available' : 'Email is already registered'
    });
  } catch (error) {
    console.error('Error checking email availability:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check email availability' 
    });
  }
});

// Neural Note - Delete user account
app.delete('/api/neural-note/user/:userId', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    // Find and delete user document
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userDoc = querySnapshot.docs[0];
    
    // Soft delete - mark as inactive instead of actually deleting
    await updateDoc(userDoc.ref, {
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting Neural Note user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user account' 
    });
  }
});

// Neural Note - Get user statistics
app.get('/api/neural-note/user/stats/:userId', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    // Get user data
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const userQuery = query(neuralNoteUsersRef, where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userData = userSnapshot.docs[0].data();

    // Here you can add logic to calculate real-time stats from notes collection
    // For now, we'll return the stored stats with some additional computed data
    const stats = {
      ...userData.stats,
      accountAge: Math.floor((new Date() - userData.createdAt.toDate()) / (1000 * 60 * 60 * 24)), // days
      isActive: userData.isActive,
      lastLoginFormatted: userData.stats.lastLogin ? new Date(userData.stats.lastLogin.toDate()).toLocaleDateString() : 'Never'
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching Neural Note user stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user statistics' 
    });
  }
});

// Neural Note - Update user statistics (for internal use)
app.put('/api/neural-note/user/stats/:userId', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { userId } = req.params;
    const { totalNotes, totalCategories } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    // Find user document
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    const q = query(neuralNoteUsersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userDoc = querySnapshot.docs[0];
    const currentData = userDoc.data();

    // Update stats
    const updateData = {
      'stats.totalNotes': totalNotes !== undefined ? Number(totalNotes) : currentData.stats.totalNotes,
      'stats.totalCategories': totalCategories !== undefined ? Number(totalCategories) : currentData.stats.totalCategories,
      updatedAt: new Date()
    };

    await updateDoc(userDoc.ref, updateData);

    res.json({
      success: true,
      message: 'User statistics updated successfully',
      stats: {
        totalNotes: updateData['stats.totalNotes'],
        totalCategories: updateData['stats.totalCategories'],
        lastLogin: currentData.stats.lastLogin
      }
    });
  } catch (error) {
    console.error('Error updating Neural Note user stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user statistics' 
    });
  }
});

// Neural Note - Get all users (admin endpoint)
app.get('/api/neural-note/admin/users', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const { page = 1, limit = 10, active = 'all' } = req.query;
    
    const neuralNoteUsersRef = collection(db, 'neuralNoteUsers');
    let q = neuralNoteUsersRef;

    // Filter by active status
    if (active === 'true') {
      q = query(neuralNoteUsersRef, where('isActive', '==', true));
    } else if (active === 'false') {
      q = query(neuralNoteUsersRef, where('isActive', '==', false));
    }

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.json({
        success: true,
        users: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalUsers: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const allUsers = querySnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data(),
      // Don't expose sensitive data
      uid: undefined
    }));

    // Simple pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(allUsers.length / Number(limit)),
        totalUsers: allUsers.length,
        hasNext: endIndex < allUsers.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Error fetching Neural Note users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users' 
    });
  }
});

// Health check endpoint for both apps
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-App Backend Server is running',
    timestamp: new Date().toISOString(),
    apps: {
      'inventory-management': 'active',
      'neural-note': 'active'
    },
    firebase: {
      status: db ? 'connected' : 'disconnected',
      auth: auth ? 'initialized' : 'not initialized'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      'inventory-management': {
        auth: {
          signup: 'POST /api/auth/signup',
          login: 'POST /api/auth/login'
        },
        products: {
          getAll: 'GET /api/products',
          create: 'POST /api/products',
          update: 'PUT /api/products/:id',
          delete: 'DELETE /api/products/:id',
          search: 'GET /api/products/search?q={query}'
        },
        stock: {
          getLogs: 'GET /api/stock-logs',
          createLog: 'POST /api/stock-logs',
          searchLogs: 'GET /api/stock-logs/search'
        },
        dashboard: {
          stats: 'GET /api/dashboard/stats',
          navigation: 'GET /api/dashboard/navigation',
          profile: 'GET /api/dashboard/profile'
        }
      },
      'neural-note': {
        auth: {
          signup: 'POST /api/neural-note/auth/signup',
          login: 'POST /api/neural-note/auth/login',
          resetPassword: 'POST /api/neural-note/auth/reset-password',
          checkEmail: 'GET /api/neural-note/auth/check-email/:email'
        },
        user: {
          getProfile: 'GET /api/neural-note/user/profile/:userId',
          updateProfile: 'PUT /api/neural-note/user/profile/:userId',
          deleteAccount: 'DELETE /api/neural-note/user/:userId',
          getStats: 'GET /api/neural-note/user/stats/:userId',
          updateStats: 'PUT /api/neural-note/user/stats/:userId'
        },
        admin: {
          getAllUsers: 'GET /api/neural-note/admin/users'
        }
      },
      system: {
        health: 'GET /api/health',
        docs: 'GET /api/docs'
      }
    }
  });
});

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Multi-App Backend Server is running on port ${port}`);
    console.log('');
    console.log('📋 Available APIs:');
    console.log('');
    console.log('🏪 Inventory Management System:');
    console.log('   Auth: /api/auth/signup, /api/auth/login');
    console.log('   Products: /api/products, /api/products/search');
    console.log('   Stock: /api/stock-logs');
    console.log('   Dashboard: /api/dashboard/*');
    console.log('');
    console.log('🧠 Neural Note App:');
    console.log('   Auth: /api/neural-note/auth/*');
    console.log('   User: /api/neural-note/user/*');
    console.log('   Admin: /api/neural-note/admin/*');
    console.log('');
    console.log('🔧 System:');
    console.log('   Health Check: /api/health');
    console.log('   API Documentation: /api/docs');
    console.log('');
    console.log('🌐 Server URL: http://localhost:' + port);
  });
}
