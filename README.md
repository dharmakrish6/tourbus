# 🚌 Tamil Nadu Tourist Bus Finder

A modern, responsive web application to search and find tourist buses across Tamil Nadu. Filter buses by district, type, availability, and seating capacity.

## 🎯 Features

- **District-wise Search**: Browse buses across 20 Tamil Nadu districts
- **Advanced Filtering**: Filter by bus type, availability, and minimum seats
- **Sorting Options**: Sort results by rating, price (low/high), or seating capacity
- **Detailed Information**: View complete bus details including location, contact, rates
- **Modal View**: See full details in a modal with easy contact options
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Quick Select**: Fast district selection with featured district chips

## 📁 Project Structure

```
tourbus/
├── index.html          # Main HTML file
├── style.css           # Styling
├── buses.json          # Bus data (hardcoded JSON)
├── js/
│   ├── data.js         # Data loading and bus retrieval functions
│   └── app.js          # Application logic and UI handlers
└── README.md           # This file
```

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Chrome, Firefox, Safari, Edge)
- No server installation required - open directly as HTML file

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tourbus
   ```

2. **Open the application**
   - Double-click `index.html` to open in your default browser, OR
   - Right-click `index.html` → Open with → Choose your browser

3. **Or use a local server** (recommended for development)
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```
   Then visit `http://localhost:8000`

## 💡 How to Use

1. **Select a District**: Click on "Select District" dropdown and choose a Tamil Nadu district
2. **Apply Filters** (Optional):
   - **Bus Type**: Filter by AC Luxury, Sleeper, Non-AC Deluxe, or Mini Bus
   - **Availability**: Show only available or unavailable buses
   - **Minimum Seats**: Specify minimum seating capacity
3. **Search**: Click "🔍 Find Buses" button
4. **Sort Results**: Click on sorting options (Rating, Price, Seats)
5. **View Details**: Click "View Full Details" to see complete bus information
6. **Contact**: Use "📧 Send Inquiry" or "📞 Call Now" buttons to reach operators
7. **Reset**: Click "↺ Reset" to clear all filters

## 📊 Data Structure

### buses.json Format
```json
{
  "districts": [
    {
      "id": "district-id",
      "name": "District Name",
      "buses": [
        {
          "id": "BUS001",
          "operator": "Bus Operator Name",
          "type": "AC Luxury",
          "location": "Address",
          "contact": "+91 xxxxxxxxxx",
          "email": "email@example.com",
          "seats": 45,
          "perDayRent": 12000,
          "amenities": ["AC", "WiFi", "USB Charging"],
          "busImage": "🚌",
          "rating": 4.8,
          "available": true
        }
      ]
    }
  ]
}
```

## 🎨 UI Features

- **Hero Section**: Eye-catching header with Tamil Nadu theme
- **Search Card**: Clean, organized filter interface
- **Bus Cards**: Display key information with visual indicators
- **Modal Popup**: Detailed view with contact information
- **Responsive Grid**: Auto-adjusts to screen size
- **Status Badges**: Shows availability status (Available/Unavailable)

## 🔧 Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables
- **JavaScript (ES6+)**: Dynamic functionality using:
  - Async/await for data loading
  - DOM manipulation
  - Event listeners
  - Array methods (filter, sort, map)

## 📝 Adding More Bus Data

To add more buses or districts, edit `buses.json`:

1. Open `buses.json`
2. Add a new district object or buses within existing districts
3. Follow the data structure format above
4. Save the file and refresh the page

Example:
```json
{
  "id": "salem",
  "name": "Salem",
  "buses": [
    {
      "id": "SAL001",
      "operator": "Salem Tours",
      "type": "AC Luxury",
      ...
    }
  ]
}
```

## 🐛 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📱 Responsive Design

- **Mobile** (320px+): Fully responsive
- **Tablet** (768px+): Optimized layout
- **Desktop** (1024px+): Full feature display

## 🔐 Notes

- All bus details are indicative and should be confirmed directly with operators
- Contact information is for demonstration purposes
- No actual bookings are processed through this application

## 📄 License

This project is open source and available for educational and commercial use.

## 👨‍💻 Developer

Created as a Tourist Bus Discovery Application for Tamil Nadu

## 🤝 Contribution

Feel free to fork, modify, and improve this project. Contributions are welcome!

---

**Last Updated**: May 28, 2026
