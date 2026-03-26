import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MdMyLocation } from "react-icons/md"; // Ensure react-icons is installed

// Fix for missing marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({ 
    iconUrl: markerIcon, 
    shadowUrl: markerShadow, 
    iconSize: [25,41], 
    iconAnchor: [12,41] 
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to handle "FlyTo" animations and fix Admin Dashboard rendering
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
        // FIXED: flyTo works better for Admin Dashboards as it forces a re-render
        map.flyTo(center, 16, { animate: true, duration: 1.5 });
        
        // CRITICAL ADMIN FIX: Forces Leaflet to recalculate container size
        // This prevents the "Grey Box" issue in modals or sidebars
        setTimeout(() => {
            map.invalidateSize();
        }, 400);
    }
  }, [center, map]);
  return null;
}

const MapPicker = ({ onChange, value }) => {
  // FIXED: Default to Paliganj, but use 'value' if we are EDITING an existing location
  const [position, setPosition] = useState(value ? [value.lat, value.lng] : [25.4775, 84.7344]) 
  const [loading, setLoading] = useState(false)

  // Sync state if 'value' changes externally (important for Admin forms)
  useEffect(() => {
    if (value?.lat && value?.lng) {
        setPosition([value.lat, value.lng])
    }
  }, [value])

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            const newPos = [latitude, longitude];
            setPosition(newPos);
            if (onChange) onChange({ lat: latitude, lng: longitude });
            setLoading(false);
        },
        (error) => {
            setLoading(false);
            console.error("GPS Error:", error);
            if (error.code === 1) {
                alert("Please enable Location Permissions in your browser settings to use this feature.");
            } else {
                alert("Unable to retrieve location. Check your Mac's System Settings.");
            }
        },
        { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        }
    );
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        setPosition([lat, lng])
        if(onChange) onChange({ lat, lng })
      },
    })
    return <Marker position={position} />
  }

  return (
    <div className='h-96 w-full rounded-xl border-2 border-green-100 overflow-hidden z-0 relative shadow-inner'>
      
      {/* GPS Button Layer */}
      <button 
        type="button"
        onClick={handleDetectLocation}
        className='absolute top-20 right-3 z-[1000] bg-white p-3 rounded-full shadow-lg hover:bg-green-50 transition-all border border-green-200 active:scale-90'
        title="Detect My Location"
      >
        <MdMyLocation className={`text-xl ${loading ? "animate-spin text-green-400" : "text-green-600"}`} />
      </button>

      <MapContainer 
        center={position} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <ChangeView center={position} />
        <LocationMarker />
      </MapContainer>
      
      <div className='absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-mono rounded-full shadow-md border border-green-100 text-green-800'>
        {position[0].toFixed(5)}, {position[1].toFixed(5)}
      </div>
    </div>
  )
}

export default MapPicker