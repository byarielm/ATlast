# ATlast  
ATlast — you'll never need to find your favorites on another platform again. This tool helps you find users you followed on TikTok within the ATmosphere, so you can keep in touch with them on Bluesky, Skylight, or whatever @pp you prefer!  

### Development  

#### Test locally
```
npm run dev
```

#### Build and preview
```
npm run build
npm run preview
mv dist docs
```

#### Enable debug mode
```
// Option 1: Add ?debug to URL
// yourapp.com?debug

// Option 2: Enable via browser console
localStorage.setItem('debug', 'true');
window.location.reload();
```

#### Disable debug mode
```
// Use the "Exit Debug Mode" button, or:
localStorage.removeItem('debug');
window.location.reload();
```