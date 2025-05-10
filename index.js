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
  res.send('Hello World!');
});

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

    // Get low stock items count
    const lowStockQuery = query(
      productsRef,
      where('stock', '<=', where('minStock', '>=', 0))
    );
    const lowStockSnapshot = await getDocs(lowStockQuery);
    const lowStockItems = lowStockSnapshot.size;

    // Get pending orders count (assuming you have an orders collection)
    const ordersRef = collection(db, 'orders');
    const pendingOrdersQuery = query(
      ordersRef,
      where('status', '==', 'pending')
    );
    const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
    const pendingOrders = pendingOrdersSnapshot.size;

    // Calculate monthly sales (assuming you have a sales collection)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const salesRef = collection(db, 'sales');
    const monthlySalesQuery = query(
      salesRef,
      where('date', '>=', firstDayOfMonth)
    );
    const monthlySalesSnapshot = await getDocs(monthlySalesQuery);
    
    let monthlySales = 0;
    monthlySalesSnapshot.forEach(doc => {
      const sale = doc.data();
      monthlySales += sale.amount || 0;
    });

    // Format the response
    const stats = [
      {
        icon: 'inventory',
        title: 'Total Products',
        value: totalProducts.toString(),
        color: '#2196F3'
      },
      {
        icon: 'warning',
        title: 'Low Stock Items',
        value: lowStockItems.toString(),
        color: '#f44336'
      },
      {
        icon: 'local-shipping',
        title: 'Pending Orders',
        value: pendingOrders.toString(),
        color: '#4CAF50'
      },
      {
        icon: 'trending-up',
        title: 'Monthly Sales',
        value: `$${(monthlySales / 1000).toFixed(1)}k`,
        color: '#FF9800'
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
