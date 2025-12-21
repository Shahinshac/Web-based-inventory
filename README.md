# 🏪 Inventory Management System

A complete **Python-based** Point of Sale (POS) and Inventory Management System built with Flask and SQLite.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Secure login with role-based access (Admin/Manager/Cashier) |
| 📊 **Dashboard** | Real-time stats, recent transactions, low stock alerts |
| 💰 **POS** | Beautiful product grid, cart management, multiple payment modes |
| 📦 **Products** | Full CRUD, stock tracking, profit calculations |
| 👥 **Customers** | B2B/B2C support, GSTIN management |
| 🧾 **Invoices** | GST-compliant invoices with print support |
| 📈 **Analytics** | Sales charts, top products, payment breakdown |
| 📋 **Reports** | Revenue summary, inventory value, profit margins |
| 👤 **User Management** | Role-based access control (Admin only) |
| 📝 **Audit Logs** | Complete activity tracking |

## 🚀 Quick Start

```bash
# Navigate to the app
cd python-app

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

### Default Login
- **Username:** `admin`
- **Password:** `admin123`

## 📁 Project Structure

```
python-app/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── database.py         # SQLite database setup
├── requirements.txt    # Python dependencies
├── inventory.db        # SQLite database (auto-created)
└── templates/
    ├── base.html       # Base template with navigation
    ├── login.html      # Login/Register page
    ├── dashboard.html  # Dashboard overview
    ├── pos.html        # Point of Sale
    ├── products.html   # Product management
    ├── customers.html  # Customer management
    ├── invoices.html   # Invoice list
    ├── analytics.html  # Sales analytics
    ├── reports.html    # Business reports
    ├── users.html      # User management
    └── audit.html      # Audit logs
```

## 🔧 Configuration

Edit `config.py` to customize:
- Company name, address, phone, email
- GST rate (default 18%)
- Session timeout
- Database path

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, delete operations, audit logs |
| **Manager** | Add/edit products & customers, view reports, process sales |
| **Cashier** | Process sales (POS), view products, add customers |

## 🛠️ Tech Stack

- **Backend:** Python 3, Flask
- **Database:** SQLite
- **Frontend:** Jinja2 Templates, CSS3
- **Icons:** Font Awesome 6

## 📝 License

MIT License - Free to use for personal and commercial projects.
