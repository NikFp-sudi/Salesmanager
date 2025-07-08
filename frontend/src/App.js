import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Tab Navigation Component
const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Transaction Form Component
const TransactionForm = ({ onTransactionAdded, onTransactionUpdated, editingTransaction, onCancelEdit, inventoryItems }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_cost: '',
    retail_price: '',
    quantity: 1,
    date_sold: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  // Update form when editing transaction changes
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        item_name: editingTransaction.item_name,
        purchase_cost: editingTransaction.purchase_cost.toString(),
        retail_price: editingTransaction.retail_price.toString(),
        quantity: editingTransaction.quantity,
        date_sold: editingTransaction.date_sold
      });
    } else {
      setFormData({
        item_name: '',
        purchase_cost: '',
        retail_price: '',
        quantity: 1,
        date_sold: new Date().toISOString().split('T')[0]
      });
    }
  }, [editingTransaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInventoryItemSelect = (e) => {
    const itemId = e.target.value;
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setSelectedInventoryItem(item);
      setFormData(prev => ({
        ...prev,
        item_name: item.item_name,
        purchase_cost: item.purchase_cost.toString(),
        retail_price: item.suggested_retail_price.toString()
      }));
    } else {
      setSelectedInventoryItem(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        purchase_cost: parseFloat(formData.purchase_cost),
        retail_price: parseFloat(formData.retail_price),
        quantity: parseInt(formData.quantity)
      };

      if (editingTransaction) {
        // Update existing transaction
        const response = await axios.put(`${API}/transactions/${editingTransaction.id}`, payload);
        onTransactionUpdated(response.data);
      } else {
        // Create new transaction
        const response = await axios.post(`${API}/transactions`, payload);
        onTransactionAdded(response.data);
      }
      
      // Reset form
      setFormData({
        item_name: '',
        purchase_cost: '',
        retail_price: '',
        quantity: 1,
        date_sold: new Date().toISOString().split('T')[0]
      });
      setSelectedInventoryItem(null);
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancelEdit();
    setSelectedInventoryItem(null);
  };

  const calculateProfit = () => {
    const cost = parseFloat(formData.purchase_cost) || 0;
    const price = parseFloat(formData.retail_price) || 0;
    const qty = parseInt(formData.quantity) || 1;
    return (price - cost) * qty;
  };

  const getAvailableStock = () => {
    if (selectedInventoryItem) {
      return selectedInventoryItem.quantity_in_stock;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {editingTransaction ? 'Edit Sale' : 'Add New Sale'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select from Inventory (Optional)
            </label>
            <select
              onChange={handleInventoryItemSelect}
              value={selectedInventoryItem?.id || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an inventory item...</option>
              {inventoryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name} - Stock: {item.quantity_in_stock} - Cost: ${item.purchase_cost} - Suggested Price: ${item.suggested_retail_price}
                </option>
              ))}
            </select>
          </div>
          
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
              {getAvailableStock() !== null && (
                <span className="text-sm text-gray-500 ml-2">
                  (Available: {getAvailableStock()})
                </span>
              )}
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              max={getAvailableStock() || undefined}
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
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isSubmitting ? 'Saving...' : (editingTransaction ? 'Update Transaction' : 'Add Transaction')}
          </button>
          
          {editingTransaction && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
            >
              Cancel
            </button>
          )}
        </div>
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
const TransactionList = ({ transactions, onTransactionDeleted, onTransactionEdit }) => {
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => onTransactionEdit(transaction)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
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

// Inventory Form Component
const InventoryForm = ({ onInventoryAdded, onInventoryUpdated, editingItem, onCancelEdit }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_cost: '',
    suggested_retail_price: '',
    quantity_in_stock: 0,
    reorder_level: 5,
    supplier: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item_name: editingItem.item_name,
        purchase_cost: editingItem.purchase_cost.toString(),
        suggested_retail_price: editingItem.suggested_retail_price.toString(),
        quantity_in_stock: editingItem.quantity_in_stock,
        reorder_level: editingItem.reorder_level,
        supplier: editingItem.supplier || '',
        category: editingItem.category || ''
      });
    } else {
      setFormData({
        item_name: '',
        purchase_cost: '',
        suggested_retail_price: '',
        quantity_in_stock: 0,
        reorder_level: 5,
        supplier: '',
        category: ''
      });
    }
  }, [editingItem]);

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
      const payload = {
        ...formData,
        purchase_cost: parseFloat(formData.purchase_cost),
        suggested_retail_price: parseFloat(formData.suggested_retail_price),
        quantity_in_stock: parseInt(formData.quantity_in_stock),
        reorder_level: parseInt(formData.reorder_level)
      };

      if (editingItem) {
        const response = await axios.put(`${API}/inventory/${editingItem.id}`, payload);
        onInventoryUpdated(response.data);
      } else {
        const response = await axios.post(`${API}/inventory`, payload);
        onInventoryAdded(response.data);
      }
      
      setFormData({
        item_name: '',
        purchase_cost: '',
        suggested_retail_price: '',
        quantity_in_stock: 0,
        reorder_level: 5,
        supplier: '',
        category: ''
      });
      
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Error saving inventory item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePotentialProfit = () => {
    const cost = parseFloat(formData.purchase_cost) || 0;
    const price = parseFloat(formData.suggested_retail_price) || 0;
    return price - cost;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
      </h2>
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
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter category"
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
              Suggested Retail Price ($)
            </label>
            <input
              type="number"
              name="suggested_retail_price"
              value={formData.suggested_retail_price}
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
              Quantity in Stock
            </label>
            <input
              type="number"
              name="quantity_in_stock"
              value={formData.quantity_in_stock}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter supplier name"
            />
          </div>
          
          <div className="md:col-span-2 flex items-end">
            <div className="text-lg font-semibold text-green-600">
              Potential Profit per Item: ${calculatePotentialProfit().toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isSubmitting ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
          </button>
          
          {editingItem && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// Inventory Stats Component
const InventoryStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Total Items</h3>
        <p className="text-3xl font-bold">{stats.total_items}</p>
      </div>
      
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Stock Value</h3>
        <p className="text-3xl font-bold">${stats.total_stock_value.toFixed(2)}</p>
      </div>
      
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Low Stock</h3>
        <p className="text-3xl font-bold">{stats.low_stock_items}</p>
      </div>
      
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6">
        <h3 className="text-sm font-medium opacity-90">Out of Stock</h3>
        <p className="text-3xl font-bold">{stats.out_of_stock_items}</p>
      </div>
    </div>
  );
};

// Inventory List Component
const InventoryList = ({ inventory, onInventoryDeleted, onInventoryEdit }) => {
  const deleteInventoryItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await axios.delete(`${API}/inventory/${id}`);
        onInventoryDeleted(id);
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        alert('Error deleting inventory item. Please try again.');
      }
    }
  };

  const getStockStatus = (item) => {
    if (item.quantity_in_stock === 0) return 'Out of Stock';
    if (item.quantity_in_stock <= item.reorder_level) return 'Low Stock';
    return 'In Stock';
  };

  const getStockStatusColor = (item) => {
    if (item.quantity_in_stock === 0) return 'text-red-600';
    if (item.quantity_in_stock <= item.reorder_level) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Inventory Items</h2>
      {inventory.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No inventory items yet. Add your first item above!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Stock</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cost</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Retail Price</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Potential Profit</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Supplier</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.category || 'Uncategorized'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.quantity_in_stock}</td>
                  <td className={`px-4 py-2 text-sm font-medium ${getStockStatusColor(item)}`}>
                    {getStockStatus(item)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">${item.purchase_cost.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">${item.suggested_retail_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-green-600 font-medium">
                    ${(item.suggested_retail_price - item.purchase_cost).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.supplier || 'N/A'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onInventoryEdit(item)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteInventoryItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
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

// Sales Chart Component
const SalesChart = ({ chartData }) => {
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: chartData.revenue_data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      },
      {
        label: 'Profit',
        data: chartData.profit_data,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Performance Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Sales Analytics</h2>
      {chartData.labels.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No sales data available for chart. Add some transactions to see the analytics!</p>
      ) : (
        <div className="h-96">
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    total_revenue: 0,
    total_profit: 0,
    total_transactions: 0,
    average_profit_margin: 0,
    best_selling_item: null,
    daily_sales: []
  });
  const [inventoryStats, setInventoryStats] = useState({
    total_items: 0,
    total_stock_value: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    categories: []
  });
  const [salesChart, setSalesChart] = useState({
    labels: [],
    revenue_data: [],
    profit_data: []
  });
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingInventoryItem, setEditingInventoryItem] = useState(null);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
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

  const fetchInventoryStats = async () => {
    try {
      const response = await axios.get(`${API}/inventory-stats`);
      setInventoryStats(response.data);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  };

  const fetchSalesChart = async () => {
    try {
      const response = await axios.get(`${API}/sales-chart`);
      setSalesChart(response.data);
    } catch (error) {
      console.error('Error fetching sales chart:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchTransactions(),
        fetchInventory(),
        fetchDashboardStats(),
        fetchInventoryStats(),
        fetchSalesChart()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleTransactionAdded = (newTransaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    fetchDashboardStats();
    fetchInventoryStats();
    fetchSalesChart();
    fetchInventory(); // Refresh inventory to update stock levels
  };

  const handleTransactionUpdated = (updatedTransaction) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    setEditingTransaction(null);
    fetchDashboardStats();
    fetchSalesChart();
  };

  const handleTransactionDeleted = (deletedId) => {
    setTransactions(prev => prev.filter(t => t.id !== deletedId));
    fetchDashboardStats();
    fetchSalesChart();
  };

  const handleTransactionEdit = (transaction) => {
    setEditingTransaction(transaction);
    setActiveTab('sales');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelTransactionEdit = () => {
    setEditingTransaction(null);
  };

  const handleInventoryAdded = (newItem) => {
    setInventory(prev => [newItem, ...prev]);
    fetchInventoryStats();
  };

  const handleInventoryUpdated = (updatedItem) => {
    setInventory(prev => 
      prev.map(i => i.id === updatedItem.id ? updatedItem : i)
    );
    setEditingInventoryItem(null);
    fetchInventoryStats();
  };

  const handleInventoryDeleted = (deletedId) => {
    setInventory(prev => prev.filter(i => i.id !== deletedId));
    fetchInventoryStats();
  };

  const handleInventoryEdit = (item) => {
    setEditingInventoryItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelInventoryEdit = () => {
    setEditingInventoryItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your business data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Tracker Pro</h1>
          <p className="text-gray-600">Complete business management solution for salespersons</p>
        </div>
        
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'dashboard' && (
          <div>
            <Dashboard stats={dashboardStats} />
            <TransactionList 
              transactions={transactions.slice(0, 10)} 
              onTransactionDeleted={handleTransactionDeleted}
              onTransactionEdit={handleTransactionEdit}
            />
          </div>
        )}
        
        {activeTab === 'sales' && (
          <div>
            <TransactionForm 
              onTransactionAdded={handleTransactionAdded}
              onTransactionUpdated={handleTransactionUpdated}
              editingTransaction={editingTransaction}
              onCancelEdit={handleCancelTransactionEdit}
              inventoryItems={inventory}
            />
            <TransactionList 
              transactions={transactions} 
              onTransactionDeleted={handleTransactionDeleted}
              onTransactionEdit={handleTransactionEdit}
            />
          </div>
        )}
        
        {activeTab === 'inventory' && (
          <div>
            <InventoryStats stats={inventoryStats} />
            <InventoryForm 
              onInventoryAdded={handleInventoryAdded}
              onInventoryUpdated={handleInventoryUpdated}
              editingItem={editingInventoryItem}
              onCancelEdit={handleCancelInventoryEdit}
            />
            <InventoryList 
              inventory={inventory} 
              onInventoryDeleted={handleInventoryDeleted}
              onInventoryEdit={handleInventoryEdit}
            />
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div>
            <Dashboard stats={dashboardStats} />
            <SalesChart chartData={salesChart} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;