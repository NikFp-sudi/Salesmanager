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

if __name__ == "__main__":
    unittest.main(argv=['first-arg-is-ignored'], exit=False)