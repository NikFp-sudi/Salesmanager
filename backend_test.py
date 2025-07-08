import requests
import json
import unittest
from datetime import date

# Use the public endpoint from frontend .env
BASE_URL = "https://96d8f304-97eb-4f5e-9f00-bb49f289a82e.preview.emergentagent.com/api"

class SalesTrackingAPITest(unittest.TestCase):
    def setUp(self):
        # Store IDs for cleanup
        self.transaction_ids = []
        self.inventory_ids = []
    
    def tearDown(self):
        # Clean up any transactions created during tests
        for transaction_id in self.transaction_ids:
            try:
                requests.delete(f"{BASE_URL}/transactions/{transaction_id}")
            except:
                pass
                
        # Clean up any inventory items created during tests
        for inventory_id in self.inventory_ids:
            try:
                requests.delete(f"{BASE_URL}/inventory/{inventory_id}")
            except:
                pass
    
    def test_01_health_check(self):
        """Test the API health check endpoint"""
        print("\n🔍 Testing API health check...")
        response = requests.get(f"{BASE_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Sales Tracking System API")
        print("✅ API health check passed")
    
    def test_02_create_transaction(self):
        """Test creating a new transaction"""
        print("\n🔍 Testing transaction creation...")
        
        # Test case from requirements: iPhone Case, $5.00 cost, $15.00 retail, 1 quantity
        transaction_data = {
            "item_name": "iPhone Case",
            "purchase_cost": 5.00,
            "retail_price": 15.00,
            "quantity": 1,
            "date_sold": date.today().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["item_name"], "iPhone Case")
        self.assertEqual(data["purchase_cost"], 5.00)
        self.assertEqual(data["retail_price"], 15.00)
        self.assertEqual(data["quantity"], 1)
        
        # Verify calculated fields
        self.assertEqual(data["profit"], 10.00)
        self.assertEqual(data["revenue"], 15.00)
        self.assertAlmostEqual(data["profit_margin"], (10.00/15.00)*100)
        
        # Save ID for cleanup
        self.transaction_ids.append(data["id"])
        print(f"✅ Transaction created successfully with ID: {data['id']}")
        return data["id"]
    
    def test_03_get_transactions(self):
        """Test retrieving all transactions"""
        print("\n🔍 Testing transaction retrieval...")
        
        # Create a transaction first
        transaction_id = self.test_02_create_transaction()
        
        # Get all transactions
        response = requests.get(f"{BASE_URL}/transactions")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Check if our transaction is in the list
        found = False
        for transaction in data:
            if transaction["id"] == transaction_id:
                found = True
                break
        
        self.assertTrue(found, "Created transaction not found in transactions list")
        print("✅ Transaction retrieval successful")
    
    def test_04_get_transaction_by_id(self):
        """Test retrieving a specific transaction by ID"""
        print("\n🔍 Testing transaction retrieval by ID...")
        
        # Create a transaction first
        transaction_id = self.test_02_create_transaction()
        
        # Get the specific transaction
        response = requests.get(f"{BASE_URL}/transactions/{transaction_id}")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["id"], transaction_id)
        self.assertEqual(data["item_name"], "iPhone Case")
        print("✅ Transaction retrieval by ID successful")
    
    def test_05_delete_transaction(self):
        """Test deleting a transaction"""
        print("\n🔍 Testing transaction deletion...")
        
        # Create a transaction first
        transaction_id = self.test_02_create_transaction()
        
        # Delete the transaction
        response = requests.delete(f"{BASE_URL}/transactions/{transaction_id}")
        self.assertEqual(response.status_code, 200)
        
        # Verify it's deleted
        response = requests.get(f"{BASE_URL}/transactions/{transaction_id}")
        self.assertEqual(response.status_code, 404)
        
        # Remove from cleanup list since we already deleted it
        self.transaction_ids.remove(transaction_id)
        print("✅ Transaction deletion successful")
    
    def test_06_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n🔍 Testing dashboard statistics...")
        
        # Create a transaction first to ensure we have data
        self.test_02_create_transaction()
        
        # Get dashboard stats
        response = requests.get(f"{BASE_URL}/dashboard")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("total_revenue", data)
        self.assertIn("total_profit", data)
        self.assertIn("total_transactions", data)
        self.assertIn("average_profit_margin", data)
        self.assertIn("daily_sales", data)
        
        # Verify stats are positive numbers
        self.assertGreater(data["total_revenue"], 0)
        self.assertGreater(data["total_profit"], 0)
        self.assertGreater(data["total_transactions"], 0)
        self.assertGreater(data["average_profit_margin"], 0)
        print("✅ Dashboard statistics retrieval successful")
    
    def test_07_edge_case_zero_profit(self):
        """Test transaction with zero profit"""
        print("\n🔍 Testing zero profit transaction...")
        
        transaction_data = {
            "item_name": "Zero Profit Item",
            "purchase_cost": 10.00,
            "retail_price": 10.00,
            "quantity": 1
        }
        
        response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["profit"], 0.00)
        self.assertEqual(data["profit_margin"], 0.00)
        
        # Save ID for cleanup
        self.transaction_ids.append(data["id"])
        print("✅ Zero profit transaction test passed")
    
    def test_08_edge_case_multiple_quantity(self):
        """Test transaction with multiple quantity"""
        print("\n🔍 Testing multiple quantity transaction...")
        
        transaction_data = {
            "item_name": "Bulk Item",
            "purchase_cost": 5.00,
            "retail_price": 10.00,
            "quantity": 5
        }
        
        response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["profit"], 25.00)  # (10-5) * 5
        self.assertEqual(data["revenue"], 50.00)  # 10 * 5
        
        # Save ID for cleanup
        self.transaction_ids.append(data["id"])
        print("✅ Multiple quantity transaction test passed")
        
    # Inventory Tests
    def test_09_create_inventory_item(self):
        """Test creating a new inventory item"""
        print("\n🔍 Testing inventory item creation...")
        
        # Test case from requirements: iPhone Case, $5.00 cost, $15.00 retail, 10 stock
        inventory_data = {
            "item_name": "iPhone Case",
            "purchase_cost": 5.00,
            "suggested_retail_price": 15.00,
            "quantity_in_stock": 10,
            "reorder_level": 5,
            "supplier": "Apple",
            "category": "Phone Accessories"
        }
        
        response = requests.post(f"{BASE_URL}/inventory", json=inventory_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["item_name"], "iPhone Case")
        self.assertEqual(data["purchase_cost"], 5.00)
        self.assertEqual(data["suggested_retail_price"], 15.00)
        self.assertEqual(data["quantity_in_stock"], 10)
        self.assertEqual(data["supplier"], "Apple")
        self.assertEqual(data["category"], "Phone Accessories")
        
        # Save ID for cleanup
        self.inventory_ids.append(data["id"])
        print(f"✅ Inventory item created successfully with ID: {data['id']}")
        return data["id"]
    
    def test_10_get_inventory_items(self):
        """Test retrieving all inventory items"""
        print("\n🔍 Testing inventory items retrieval...")
        
        # Create an inventory item first
        inventory_id = self.test_09_create_inventory_item()
        
        # Get all inventory items
        response = requests.get(f"{BASE_URL}/inventory")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Check if our inventory item is in the list
        found = False
        for item in data:
            if item["id"] == inventory_id:
                found = True
                break
        
        self.assertTrue(found, "Created inventory item not found in inventory list")
        print("✅ Inventory items retrieval successful")
    
    def test_11_get_inventory_item_by_id(self):
        """Test retrieving a specific inventory item by ID"""
        print("\n🔍 Testing inventory item retrieval by ID...")
        
        # Create an inventory item first
        inventory_id = self.test_09_create_inventory_item()
        
        # Get the specific inventory item
        response = requests.get(f"{BASE_URL}/inventory/{inventory_id}")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["id"], inventory_id)
        self.assertEqual(data["item_name"], "iPhone Case")
        print("✅ Inventory item retrieval by ID successful")
    
    def test_12_update_inventory_item(self):
        """Test updating an inventory item"""
        print("\n🔍 Testing inventory item update...")
        
        # Create an inventory item first
        inventory_id = self.test_09_create_inventory_item()
        
        # Update the inventory item
        update_data = {
            "quantity_in_stock": 15,
            "suggested_retail_price": 20.00
        }
        
        response = requests.put(f"{BASE_URL}/inventory/{inventory_id}", json=update_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["id"], inventory_id)
        self.assertEqual(data["quantity_in_stock"], 15)
        self.assertEqual(data["suggested_retail_price"], 20.00)
        print("✅ Inventory item update successful")
    
    def test_13_delete_inventory_item(self):
        """Test deleting an inventory item"""
        print("\n🔍 Testing inventory item deletion...")
        
        # Create an inventory item first
        inventory_id = self.test_09_create_inventory_item()
        
        # Delete the inventory item
        response = requests.delete(f"{BASE_URL}/inventory/{inventory_id}")
        self.assertEqual(response.status_code, 200)
        
        # Verify it's deleted
        response = requests.get(f"{BASE_URL}/inventory/{inventory_id}")
        self.assertEqual(response.status_code, 404)
        
        # Remove from cleanup list since we already deleted it
        self.inventory_ids.remove(inventory_id)
        print("✅ Inventory item deletion successful")
    
    def test_14_inventory_stats(self):
        """Test inventory statistics"""
        print("\n🔍 Testing inventory statistics...")
        
        # Create an inventory item first to ensure we have data
        self.test_09_create_inventory_item()
        
        # Get inventory stats
        response = requests.get(f"{BASE_URL}/inventory-stats")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("total_items", data)
        self.assertIn("total_stock_value", data)
        self.assertIn("low_stock_items", data)
        self.assertIn("out_of_stock_items", data)
        self.assertIn("categories", data)
        
        # Verify stats are valid
        self.assertGreaterEqual(data["total_items"], 1)
        self.assertGreaterEqual(data["total_stock_value"], 50.00)  # 5.00 * 10
        self.assertIsInstance(data["categories"], list)
        self.assertIn("Phone Accessories", data["categories"])
        print("✅ Inventory statistics retrieval successful")
    
    def test_15_sales_chart_data(self):
        """Test sales chart data"""
        print("\n🔍 Testing sales chart data...")
        
        # Create a transaction first to ensure we have data
        self.test_02_create_transaction()
        
        # Get sales chart data
        response = requests.get(f"{BASE_URL}/sales-chart")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("labels", data)
        self.assertIn("revenue_data", data)
        self.assertIn("profit_data", data)
        
        # Verify data structure
        self.assertIsInstance(data["labels"], list)
        self.assertIsInstance(data["revenue_data"], list)
        self.assertIsInstance(data["profit_data"], list)
        
        # Verify data length consistency
        self.assertEqual(len(data["labels"]), len(data["revenue_data"]))
        self.assertEqual(len(data["labels"]), len(data["profit_data"]))
        print("✅ Sales chart data retrieval successful")
    
    def test_16_inventory_integration_with_sales(self):
        """Test inventory integration with sales"""
        print("\n🔍 Testing inventory integration with sales...")
        
        # Create an inventory item
        inventory_data = {
            "item_name": "Integration Test Item",
            "purchase_cost": 10.00,
            "suggested_retail_price": 25.00,
            "quantity_in_stock": 5,
            "reorder_level": 2,
            "category": "Test Category"
        }
        
        response = requests.post(f"{BASE_URL}/inventory", json=inventory_data)
        self.assertEqual(response.status_code, 200)
        inventory_item = response.json()
        self.inventory_ids.append(inventory_item["id"])
        
        # Create a sale for this inventory item
        transaction_data = {
            "item_name": "Integration Test Item",
            "purchase_cost": 10.00,
            "retail_price": 25.00,
            "quantity": 2
        }
        
        response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
        self.assertEqual(response.status_code, 200)
        transaction = response.json()
        self.transaction_ids.append(transaction["id"])
        
        # Verify inventory quantity was reduced
        response = requests.get(f"{BASE_URL}/inventory/{inventory_item['id']}")
        self.assertEqual(response.status_code, 200)
        updated_inventory = response.json()
        
        # Quantity should be reduced by the sale quantity
        self.assertEqual(updated_inventory["quantity_in_stock"], 3)  # 5 - 2
        print("✅ Inventory integration with sales successful")
    
    def test_17_edge_case_out_of_stock(self):
        """Test out of stock inventory item"""
        print("\n🔍 Testing out of stock inventory item...")
        
        # Create an inventory item with zero stock
        inventory_data = {
            "item_name": "Out of Stock Item",
            "purchase_cost": 15.00,
            "suggested_retail_price": 30.00,
            "quantity_in_stock": 0,
            "reorder_level": 5
        }
        
        response = requests.post(f"{BASE_URL}/inventory", json=inventory_data)
        self.assertEqual(response.status_code, 200)
        inventory_item = response.json()
        self.inventory_ids.append(inventory_item["id"])
        
        # Get inventory stats
        response = requests.get(f"{BASE_URL}/inventory-stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        
        # Verify out of stock count increased
        self.assertGreaterEqual(stats["out_of_stock_items"], 1)
        print("✅ Out of stock inventory test passed")
    
    def test_18_edge_case_low_stock(self):
        """Test low stock inventory item"""
        print("\n🔍 Testing low stock inventory item...")
        
        # Create an inventory item with stock at reorder level
        inventory_data = {
            "item_name": "Low Stock Item",
            "purchase_cost": 20.00,
            "suggested_retail_price": 40.00,
            "quantity_in_stock": 3,
            "reorder_level": 5
        }
        
        response = requests.post(f"{BASE_URL}/inventory", json=inventory_data)
        self.assertEqual(response.status_code, 200)
        inventory_item = response.json()
        self.inventory_ids.append(inventory_item["id"])
        
        # Get inventory stats
        response = requests.get(f"{BASE_URL}/inventory-stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        
        # Verify low stock count increased
        self.assertGreaterEqual(stats["low_stock_items"], 1)
        print("✅ Low stock inventory test passed")

if __name__ == "__main__":
    unittest.main(argv=['first-arg-is-ignored'], exit=False)