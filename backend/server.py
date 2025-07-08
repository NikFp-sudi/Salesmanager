from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
from decimal import Decimal


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class SalesTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    purchase_cost: float
    retail_price: float
    quantity: int = 1
    profit: float = 0.0
    revenue: float = 0.0
    profit_margin: float = 0.0
    date_sold: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SalesTransactionCreate(BaseModel):
    item_name: str
    purchase_cost: float
    retail_price: float
    quantity: int = 1
    date_sold: Optional[date] = None

class SalesTransactionUpdate(BaseModel):
    item_name: Optional[str] = None
    purchase_cost: Optional[float] = None
    retail_price: Optional[float] = None
    quantity: Optional[int] = None
    date_sold: Optional[date] = None

class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    purchase_cost: float
    suggested_retail_price: float
    quantity_in_stock: int
    reorder_level: int = 5
    supplier: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class InventoryItemCreate(BaseModel):
    item_name: str
    purchase_cost: float
    suggested_retail_price: float
    quantity_in_stock: int
    reorder_level: int = 5
    supplier: Optional[str] = None
    category: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    item_name: Optional[str] = None
    purchase_cost: Optional[float] = None
    suggested_retail_price: Optional[float] = None
    quantity_in_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    supplier: Optional[str] = None
    category: Optional[str] = None

class DashboardStats(BaseModel):
    total_revenue: float
    total_profit: float
    total_transactions: int
    average_profit_margin: float
    best_selling_item: Optional[str]
    daily_sales: List[dict]

class InventoryStats(BaseModel):
    total_items: int
    total_stock_value: float
    low_stock_items: int
    out_of_stock_items: int
    categories: List[str]

class SalesChart(BaseModel):
    labels: List[str]
    revenue_data: List[float]
    profit_data: List[float]

# Helper function to calculate transaction metrics
def calculate_transaction_metrics(transaction_data):
    purchase_cost = transaction_data['purchase_cost']
    retail_price = transaction_data['retail_price']
    quantity = transaction_data['quantity']
    
    profit_per_item = retail_price - purchase_cost
    total_profit = profit_per_item * quantity
    total_revenue = retail_price * quantity
    profit_margin = (profit_per_item / retail_price * 100) if retail_price > 0 else 0
    
    return {
        'profit': total_profit,
        'revenue': total_revenue,
        'profit_margin': profit_margin
    }

# Helper function to update inventory when sale is made
async def update_inventory_on_sale(item_name: str, quantity_sold: int):
    # Find inventory item by name
    inventory_item = await db.inventory.find_one({"item_name": item_name})
    if inventory_item:
        new_quantity = inventory_item['quantity_in_stock'] - quantity_sold
        if new_quantity < 0:
            new_quantity = 0
        
        await db.inventory.update_one(
            {"item_name": item_name},
            {"$set": {"quantity_in_stock": new_quantity, "updated_at": datetime.utcnow()}}
        )

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Sales Tracking System API"}

# Sales Transaction Endpoints
@api_router.post("/transactions", response_model=SalesTransaction)
async def create_transaction(input: SalesTransactionCreate):
    transaction_dict = input.dict()
    
    # Set default date if not provided
    if not transaction_dict.get('date_sold'):
        transaction_dict['date_sold'] = date.today()
    
    # Calculate metrics
    metrics = calculate_transaction_metrics(transaction_dict)
    transaction_dict.update(metrics)
    
    # Create transaction object
    transaction_obj = SalesTransaction(**transaction_dict)
    
    # Convert to dict for MongoDB (handle date serialization)
    transaction_for_db = transaction_obj.dict()
    transaction_for_db['date_sold'] = transaction_for_db['date_sold'].isoformat()
    
    # Insert into database
    result = await db.transactions.insert_one(transaction_for_db)
    
    # Update inventory
    await update_inventory_on_sale(transaction_obj.item_name, transaction_obj.quantity)
    
    return transaction_obj

@api_router.get("/transactions", response_model=List[SalesTransaction])
async def get_transactions():
    transactions = await db.transactions.find().sort("created_at", -1).to_list(1000)
    
    # Convert date strings back to date objects
    for transaction in transactions:
        if isinstance(transaction['date_sold'], str):
            transaction['date_sold'] = datetime.fromisoformat(transaction['date_sold']).date()
    
    return [SalesTransaction(**transaction) for transaction in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=SalesTransaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Convert date string back to date object
    if isinstance(transaction['date_sold'], str):
        transaction['date_sold'] = datetime.fromisoformat(transaction['date_sold']).date()
    
    return SalesTransaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=SalesTransaction)
async def update_transaction(transaction_id: str, input: SalesTransactionUpdate):
    # Get existing transaction
    existing_transaction = await db.transactions.find_one({"id": transaction_id})
    if not existing_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Convert existing transaction date back to date object if it's a string
    if isinstance(existing_transaction['date_sold'], str):
        existing_transaction['date_sold'] = datetime.fromisoformat(existing_transaction['date_sold']).date()
    
    # Update only provided fields
    update_data = input.dict(exclude_unset=True)
    
    # Merge with existing data
    transaction_dict = {**existing_transaction, **update_data}
    
    # Recalculate metrics with updated data
    metrics = calculate_transaction_metrics(transaction_dict)
    transaction_dict.update(metrics)
    
    # Update the updated timestamp
    transaction_dict['created_at'] = datetime.utcnow()
    
    # Create updated transaction object
    updated_transaction = SalesTransaction(**transaction_dict)
    
    # Convert to dict for MongoDB (handle date serialization)
    transaction_for_db = updated_transaction.dict()
    transaction_for_db['date_sold'] = transaction_for_db['date_sold'].isoformat()
    
    # Update in database
    await db.transactions.update_one(
        {"id": transaction_id}, 
        {"$set": transaction_for_db}
    )
    
    return updated_transaction

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Inventory Endpoints
@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(input: InventoryItemCreate):
    item_dict = input.dict()
    item_obj = InventoryItem(**item_dict)
    
    # Insert into database
    result = await db.inventory.insert_one(item_obj.dict())
    
    return item_obj

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory():
    items = await db.inventory.find().sort("item_name", 1).to_list(1000)
    return [InventoryItem(**item) for item in items]

@api_router.get("/inventory/{item_id}", response_model=InventoryItem)
async def get_inventory_item(item_id: str):
    item = await db.inventory.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return InventoryItem(**item)

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, input: InventoryItemUpdate):
    existing_item = await db.inventory.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Update only provided fields
    update_data = input.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    # Merge with existing data
    item_dict = {**existing_item, **update_data}
    
    # Create updated item object
    updated_item = InventoryItem(**item_dict)
    
    # Update in database
    await db.inventory.update_one(
        {"id": item_id}, 
        {"$set": updated_item.dict()}
    )
    
    return updated_item

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"message": "Inventory item deleted successfully"}

@api_router.get("/inventory-stats", response_model=InventoryStats)
async def get_inventory_stats():
    items = await db.inventory.find().to_list(1000)
    
    if not items:
        return InventoryStats(
            total_items=0,
            total_stock_value=0.0,
            low_stock_items=0,
            out_of_stock_items=0,
            categories=[]
        )
    
    total_items = len(items)
    total_stock_value = sum(item['purchase_cost'] * item['quantity_in_stock'] for item in items)
    low_stock_items = sum(1 for item in items if item['quantity_in_stock'] <= item['reorder_level'] and item['quantity_in_stock'] > 0)
    out_of_stock_items = sum(1 for item in items if item['quantity_in_stock'] == 0)
    
    categories = list(set(item.get('category', 'Uncategorized') for item in items))
    
    return InventoryStats(
        total_items=total_items,
        total_stock_value=total_stock_value,
        low_stock_items=low_stock_items,
        out_of_stock_items=out_of_stock_items,
        categories=categories
    )

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    # Get all transactions
    transactions = await db.transactions.find().to_list(1000)
    
    if not transactions:
        return DashboardStats(
            total_revenue=0.0,
            total_profit=0.0,
            total_transactions=0,
            average_profit_margin=0.0,
            best_selling_item=None,
            daily_sales=[]
        )
    
    # Calculate totals
    total_revenue = sum(t['revenue'] for t in transactions)
    total_profit = sum(t['profit'] for t in transactions)
    total_transactions = len(transactions)
    
    # Calculate average profit margin
    profit_margins = [t['profit_margin'] for t in transactions if t['profit_margin'] > 0]
    average_profit_margin = sum(profit_margins) / len(profit_margins) if profit_margins else 0
    
    # Find best selling item (by quantity)
    item_sales = {}
    for t in transactions:
        item_name = t['item_name']
        if item_name in item_sales:
            item_sales[item_name] += t['quantity']
        else:
            item_sales[item_name] = t['quantity']
    
    best_selling_item = max(item_sales, key=item_sales.get) if item_sales else None
    
    # Calculate daily sales for the last 7 days
    from collections import defaultdict
    daily_sales = defaultdict(lambda: {'revenue': 0, 'profit': 0, 'transactions': 0})
    
    for t in transactions:
        # Handle date conversion
        if isinstance(t['date_sold'], str):
            transaction_date = datetime.fromisoformat(t['date_sold']).date()
        else:
            transaction_date = t['date_sold']
        
        date_str = transaction_date.isoformat()
        daily_sales[date_str]['revenue'] += t['revenue']
        daily_sales[date_str]['profit'] += t['profit']
        daily_sales[date_str]['transactions'] += 1
    
    # Convert to list format
    daily_sales_list = [
        {
            'date': date_str,
            'revenue': stats['revenue'],
            'profit': stats['profit'],
            'transactions': stats['transactions']
        }
        for date_str, stats in sorted(daily_sales.items())
    ]
    
    return DashboardStats(
        total_revenue=total_revenue,
        total_profit=total_profit,
        total_transactions=total_transactions,
        average_profit_margin=average_profit_margin,
        best_selling_item=best_selling_item,
        daily_sales=daily_sales_list
    )

@api_router.get("/sales-chart", response_model=SalesChart)
async def get_sales_chart():
    # Get all transactions
    transactions = await db.transactions.find().to_list(1000)
    
    if not transactions:
        return SalesChart(
            labels=[],
            revenue_data=[],
            profit_data=[]
        )
    
    # Group by date
    from collections import defaultdict
    daily_data = defaultdict(lambda: {'revenue': 0, 'profit': 0})
    
    for t in transactions:
        # Handle date conversion
        if isinstance(t['date_sold'], str):
            transaction_date = datetime.fromisoformat(t['date_sold']).date()
        else:
            transaction_date = t['date_sold']
        
        date_str = transaction_date.isoformat()
        daily_data[date_str]['revenue'] += t['revenue']
        daily_data[date_str]['profit'] += t['profit']
    
    # Sort by date and prepare for chart
    sorted_dates = sorted(daily_data.keys())
    labels = sorted_dates
    revenue_data = [daily_data[date]['revenue'] for date in sorted_dates]
    profit_data = [daily_data[date]['profit'] for date in sorted_dates]
    
    return SalesChart(
        labels=labels,
        revenue_data=revenue_data,
        profit_data=profit_data
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()