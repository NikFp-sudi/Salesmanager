import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Transaction Form Component
const TransactionForm = ({ onTransactionAdded }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_cost: '',
    retail_price: '',
    quantity: 1,
    date_sold: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await axios.post(`${API}/transactions`, {
        ...formData,
        purchase_cost: parseFloat(formData.purchase_cost),
        retail_price: parseFloat(formData.retail_price),
        quantity: parseInt(formData.quantity)
      });
      
      // Reset form
      setFormData({
        item_name: '',
        purchase_cost: '',
        retail_price: '',
        quantity: 1,
        date_sold: new Date().toISOString().split('T')[0]
      });
      
      onTransactionAdded(response.data);
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProfit = () => {
    const cost = parseFloat(formData.purchase_cost) || 0;
    const price = parseFloat(formData.retail_price) || 0;
    const qty = parseInt(formData.quantity) || 1;
    return (price - cost) * qty;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Sale</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter item name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Cost ($)
            </label>
            <input
              type="number"
              name="purchase_cost"
              value={formData.purchase_cost}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retail Price ($)
            </label>
            <input
              type="number"
              name="retail_price"
              value={formData.retail_price}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Sold
            </label>
            <input
              type="date"
              name="date_sold"
              value={formData.date_sold}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <div className="text-lg font-semibold text-green-600">
              Profit: ${calculateProfit().toFixed(2)}
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
        >
          {isSubmitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
        <p className="text-3xl font-bold">${stats.total_revenue.toFixed(2)}</p>
      </div>
      
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Total Profit</h3>
        <p className="text-3xl font-bold">${stats.total_profit.toFixed(2)}</p>
      </div>
      
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Total Sales</h3>
        <p className="text-3xl font-bold">{stats.total_transactions}</p>
      </div>
      
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Avg Profit Margin</h3>
        <p className="text-3xl font-bold">{stats.average_profit_margin.toFixed(1)}%</p>
      </div>
    </div>
  );
};

// Transaction List Component
const TransactionList = ({ transactions, onTransactionDeleted }) => {
  const deleteTransaction = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axios.delete(`${API}/transactions/${id}`);
        onTransactionDeleted(id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Recent Transactions</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No transactions yet. Add your first sale above!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cost</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Revenue</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Profit</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Margin</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{transaction.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{transaction.date_sold}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{transaction.quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">${transaction.purchase_cost.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">${transaction.retail_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-blue-600 font-medium">${transaction.revenue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-green-600 font-medium">${transaction.profit.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{transaction.profit_margin.toFixed(1)}%</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [transactions, setTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    total_revenue: 0,
    total_profit: 0,
    total_transactions: 0,
    average_profit_margin: 0,
    best_selling_item: null,
    daily_sales: []
  });
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTransactions(), fetchDashboardStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleTransactionAdded = (newTransaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    fetchDashboardStats(); // Refresh stats
  };

  const handleTransactionDeleted = (deletedId) => {
    setTransactions(prev => prev.filter(t => t.id !== deletedId));
    fetchDashboardStats(); // Refresh stats
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Tracker</h1>
          <p className="text-gray-600">Monitor your earnings and track your business performance</p>
        </div>
        
        <Dashboard stats={dashboardStats} />
        
        <TransactionForm onTransactionAdded={handleTransactionAdded} />
        
        <TransactionList 
          transactions={transactions} 
          onTransactionDeleted={handleTransactionDeleted}
        />
      </div>
    </div>
  );
}

export default App;