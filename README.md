# HotspotKenya - WiFi Hotspot Billing System

HotspotKenya is a Django-based WiFi hotspot billing system that allows users to purchase internet packages, make payments via M-Pesa, and manage their subscriptions.

## Screenshots

### Home Page
![Home Page](images/iuigt)
*Landing page with hero section, features, and popular packages*

### Packages Page
![Packages Page](https://raw.githubusercontent.com/Denisganga/HotspotKenya/main/screenshots/packages_page.svg)
*Browse available internet packages with details and pricing*

### User Dashboard
![User Dashboard](https://raw.githubusercontent.com/Denisganga/HotspotKenya/main/screenshots/dashboard_page.svg)
*User dashboard showing active subscriptions and quick actions*

### Payment Page
![Payment Page](https://raw.githubusercontent.com/Denisganga/HotspotKenya/main/screenshots/payment_page.svg)
*M-Pesa payment integration for package subscription*

## Features

- User authentication and profile management
- Internet package browsing and subscription
- M-Pesa payment integration
- Subscription management
- Admin dashboard for managing packages, users, and payments

## Installation

1. Clone the repository:
```
git clone https://github.com/Denisganga/HotspotKenya.git
cd HotspotKenya
```

2. Create a virtual environment and activate it:
```
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

4. Run migrations:
```
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser:
```
python manage.py createsuperuser
```

6. Run the development server:
```
python manage.py runserver
```

## Project Structure

- `accounts`: User authentication and profile management
- `billing`: Package and subscription management
- `payments`: Payment processing with M-Pesa integration
- `templates`: HTML templates for the application
- `media`: User-uploaded files (profile pictures, package images)
- `static`: Static files (CSS, JavaScript, images)

## Usage

1. Access the admin panel at `http://localhost:8000/admin/` to add packages
2. Register a new user account
3. Browse available packages
4. Subscribe to a package and make payment via M-Pesa
5. Access the internet using the provided voucher code

## M-Pesa Integration

The project includes a simulated M-Pesa STK Push API integration. In a production environment, you would need to:

1. Register for Safaricom Developer API credentials
2. Configure the M-Pesa API settings in the project
3. Set up proper callback URLs for payment confirmation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
