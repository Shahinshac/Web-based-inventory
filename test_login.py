import requests
import json

url = "http://localhost:5000/api/users/login"
headers = {"Content-Type": "application/json"}
data = {"username": "admin", "password": "admin123"}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Response Text: {response.text if 'response' in locals() else 'N/A'}")
